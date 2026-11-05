CREATE TABLE users (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  email             VARCHAR(255)  NOT NULL,
  email_verified_at DATETIME      NULL COMMENT 'NULL이면 미인증. 구글 로그인은 가입 시 설정',
  password_hash     VARCHAR(100)  NULL COMMENT 'BCrypt. 구글 전용 계정은 NULL',
  google_sub        VARCHAR(255)  NULL COMMENT 'Google ID 토큰의 sub',
  nickname          VARCHAR(30)   NOT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email),
  UNIQUE KEY uk_users_google_sub (google_sub),
  UNIQUE KEY uk_users_nickname (nickname),
  CONSTRAINT ck_users_login_method CHECK (password_hash IS NOT NULL OR google_sub IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 사용자당 유효한 코드는 하나다. 재발송하면 행을 덮어쓰고, 인증에 성공하면 행을 지운다
CREATE TABLE email_verifications (
  user_id       BIGINT    NOT NULL,
  code_hash     CHAR(64)  NOT NULL COMMENT '코드 원문이 아닌 HMAC-SHA256 해시',
  expires_at    DATETIME  NOT NULL COMMENT '발송 후 10분',
  attempts      TINYINT   NOT NULL DEFAULT 0 COMMENT '5회 실패하면 코드 무효',
  last_sent_at  DATETIME  NOT NULL COMMENT '재발송 60초 제한 기준',
  PRIMARY KEY (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE refresh_tokens (
  id          BIGINT    NOT NULL AUTO_INCREMENT,
  user_id     BIGINT    NOT NULL,
  token_hash  CHAR(64)  NOT NULL COMMENT '토큰 원문이 아닌 SHA-256 해시',
  expires_at  DATETIME  NOT NULL,
  revoked_at  DATETIME  NULL,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_refresh_token_hash (token_hash),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE diaries (
  id            BIGINT       NOT NULL AUTO_INCREMENT,
  user_id       BIGINT       NOT NULL,
  logical_date  DATE         NULL COMMENT '확정(confirm) 시 설정',
  status        VARCHAR(20)  NOT NULL DEFAULT 'METADATA_PENDING',
  visibility    VARCHAR(10)  NOT NULL DEFAULT 'PRIVATE',
  template_id   VARCHAR(50)  NOT NULL DEFAULT 'default' COMMENT '프론트엔드 템플릿 식별자',
  published_at  DATETIME     NULL COMMENT '처음 공개한 시각. 점수가 같을 때의 정렬 기준',
  completed_at  DATETIME     NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_diaries_owner_list (user_id, status, logical_date),
  KEY idx_diaries_feed (status, visibility, published_at),
  CONSTRAINT fk_diaries_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_diaries_status CHECK (status IN ('METADATA_PENDING', 'CREATING', 'COMPLETED')),
  CONSTRAINT ck_diaries_visibility CHECK (visibility IN ('PRIVATE', 'PUBLIC'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE diary_pages (
  id                BIGINT        NOT NULL AUTO_INCREMENT,
  diary_id          BIGINT        NOT NULL,
  sort_order        TINYINT       NOT NULL COMMENT '업로드 순서로 시작해 확정 시 시간순으로 재배치',

  -- 날짜와 시간
  taken_at          DATETIME      NULL COMMENT '시간을 모르면 NULL',
  logical_date      DATE          NULL COMMENT 'taken_at - 5시간의 날짜 또는 사용자 입력 날짜',
  date_source       VARCHAR(10)   NULL COMMENT 'NULL이면 입력 대기',

  -- 위치
  region            VARCHAR(10)   NULL COMMENT '모르겠습니다를 고르면 NULL',
  location_source   VARCHAR(10)   NULL COMMENT 'NULL이면 입력 대기',

  -- 이미지 상태 (파일 경로는 page_images)
  image_status      VARCHAR(12)   NOT NULL DEFAULT 'PENDING',
  image_source      VARCHAR(10)   NULL COMMENT '페이지에 표시할 이미지 종류',
  image_attempts    TINYINT       NOT NULL DEFAULT 0,
  image_error       VARCHAR(255)  NULL,

  -- 대화와 글
  chat_status       VARCHAR(12)   NOT NULL DEFAULT 'NOT_STARTED',
  estimated_chars   SMALLINT      NOT NULL DEFAULT 0 COMMENT 'AI가 추정한 일기 분량',
  content           VARCHAR(800)  NULL COMMENT '일기 글. utf8mb4에서 800자 상한',

  -- 공개
  visibility        VARCHAR(12)   NOT NULL DEFAULT 'PRIVATE',
  report_blocked_at DATETIME      NULL COMMENT '신고 3건으로 차단된 시각',

  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_pages_diary_order (diary_id, sort_order),
  KEY idx_pages_region_feed (region, visibility, report_blocked_at, diary_id),
  CONSTRAINT fk_pages_diary FOREIGN KEY (diary_id) REFERENCES diaries (id) ON DELETE CASCADE,
  CONSTRAINT ck_pages_date_source CHECK (date_source IS NULL OR date_source IN ('EXIF', 'USER_INPUT')),
  CONSTRAINT ck_pages_region CHECK (region IS NULL OR region IN ('MAPO', 'JONGNO', 'JUNG', 'GANGNAM')),
  CONSTRAINT ck_pages_location_source CHECK (location_source IS NULL OR location_source IN ('EXIF', 'USER_INPUT', 'UNKNOWN')),
  CONSTRAINT ck_pages_image_status CHECK (image_status IN ('PENDING', 'PROCESSING', 'DONE', 'FAILED')),
  CONSTRAINT ck_pages_image_source CHECK (image_source IS NULL OR image_source IN ('CONVERTED', 'ORIGINAL')),
  CONSTRAINT ck_pages_chat_status CHECK (chat_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  CONSTRAINT ck_pages_visibility CHECK (visibility IN ('PRIVATE', 'PHOTO_HIDDEN', 'PUBLIC')),
  -- 위치를 알면 region이 있고, 모르거나 입력 대기면 region은 NULL이다
  CONSTRAINT ck_pages_location_region CHECK (
    (location_source IN ('EXIF', 'USER_INPUT') AND region IS NOT NULL)
    OR (location_source = 'UNKNOWN' AND region IS NULL)
    OR (location_source IS NULL AND region IS NULL)
  ),
  -- 위치 미상인 페이지는 공유할 수 없다
  CONSTRAINT ck_pages_shareable CHECK (visibility = 'PRIVATE' OR region IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- 파일은 이미지 저장소에 있고 이 테이블에는 경로만 저장한다
CREATE TABLE page_images (
  id            BIGINT        NOT NULL AUTO_INCREMENT,
  page_id       BIGINT        NOT NULL,
  kind          VARCHAR(10)   NOT NULL,
  content_type  VARCHAR(50)   NOT NULL,
  byte_size     INT           NOT NULL,
  storage_path  VARCHAR(255)  NOT NULL COMMENT '저장소 루트 기준 상대 경로. ORIGINAL은 EXIF를 지운 사본',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_images_page_kind (page_id, kind),
  UNIQUE KEY uk_images_storage_path (storage_path),
  CONSTRAINT fk_images_page FOREIGN KEY (page_id) REFERENCES diary_pages (id) ON DELETE CASCADE,
  CONSTRAINT ck_images_kind CHECK (kind IN ('ORIGINAL', 'CONVERTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE page_embeddings (
  page_id     BIGINT       NOT NULL,
  model       VARCHAR(64)  NOT NULL COMMENT '생성에 사용한 Gemini 임베딩 모델',
  dimensions  SMALLINT     NOT NULL COMMENT '기본 768',
  embedding   BLOB         NOT NULL COMMENT 'float32 little-endian 배열, 정규화된 벡터',
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (page_id),
  CONSTRAINT fk_embeddings_page FOREIGN KEY (page_id) REFERENCES diary_pages (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE chat_messages (
  id          BIGINT       NOT NULL AUTO_INCREMENT,
  page_id     BIGINT       NOT NULL,
  role        VARCHAR(10)  NOT NULL,
  content     TEXT         NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chat_page (page_id, id),
  CONSTRAINT fk_chat_page FOREIGN KEY (page_id) REFERENCES diary_pages (id) ON DELETE CASCADE,
  CONSTRAINT ck_chat_role CHECK (role IN ('ASSISTANT', 'USER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE page_reactions (
  page_id     BIGINT       NOT NULL,
  user_id     BIGINT       NOT NULL,
  type        VARCHAR(10)  NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (page_id, user_id),
  KEY idx_reactions_score (page_id, type),
  KEY idx_reactions_user (user_id),
  CONSTRAINT fk_reactions_page FOREIGN KEY (page_id) REFERENCES diary_pages (id) ON DELETE CASCADE,
  CONSTRAINT fk_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_reactions_type CHECK (type IN ('LIKE', 'DISLIKE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE page_reports (
  id           BIGINT        NOT NULL AUTO_INCREMENT,
  page_id      BIGINT        NOT NULL,
  reporter_id  BIGINT        NOT NULL,
  reason       VARCHAR(20)   NOT NULL,
  detail       VARCHAR(500)  NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_reports_once (page_id, reporter_id),
  KEY idx_reports_reporter (reporter_id),
  CONSTRAINT fk_reports_page FOREIGN KEY (page_id) REFERENCES diary_pages (id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_user FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT ck_reports_reason CHECK (reason IN ('SPAM', 'INAPPROPRIATE', 'PRIVACY', 'OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

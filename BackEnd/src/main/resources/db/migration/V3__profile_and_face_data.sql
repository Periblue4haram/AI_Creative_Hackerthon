-- 프론트엔드 화면(scrapbook-ui-v3) 반영
-- 닉네임 중복 허용, 개인정보처리방침 동의, 프로필 사진, 얼굴 데이터

ALTER TABLE users DROP INDEX uk_users_nickname;

ALTER TABLE users
  ADD COLUMN privacy_agreed_at DATETIME NULL COMMENT '개인정보처리방침 동의 시각',
  ADD COLUMN profile_image_path VARCHAR(255) NULL COMMENT '프로필 사진. 저장소 루트 기준 상대 경로',
  ADD COLUMN profile_image_version INT NOT NULL DEFAULT 0 COMMENT '바뀔 때마다 증가. 이미지 URL 캐시 구분용',
  ADD COLUMN face_image_path VARCHAR(255) NULL COMMENT '등록한 얼굴 사진. 저장소 루트 기준 상대 경로',
  ADD COLUMN face_registered_at DATETIME NULL,
  ADD COLUMN face_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '그림 변환에 얼굴 데이터를 쓸지';

-- 시연·테스트용 더미 계정. 이메일 인증을 마친 상태로 만든다
-- 이메일: dummy123@gmail.com / 비밀번호: dummy123 (BCrypt 해시로 저장)
-- 같은 이메일이 이미 있으면 비밀번호·닉네임·인증 상태를 덮어쓴다
INSERT INTO users (email, email_verified_at, password_hash, nickname, privacy_agreed_at)
VALUES ('dummy123@gmail.com', NOW(), '$2a$10$FZd5W3Djggy2tluXd8.j0egeDPHJVsOlDnK81M3rqBd.gA.HbNRSS', 'DUMMY', NOW())
ON DUPLICATE KEY UPDATE
  email_verified_at = COALESCE(email_verified_at, NOW()),
  password_hash     = VALUES(password_hash),
  nickname          = VALUES(nickname),
  privacy_agreed_at = COALESCE(privacy_agreed_at, NOW());

-- 지원 지역에 서대문구를 추가한다
ALTER TABLE diary_pages DROP CHECK ck_pages_region;
ALTER TABLE diary_pages
  ADD CONSTRAINT ck_pages_region CHECK (region IS NULL OR region IN ('MAPO', 'JONGNO', 'JUNG', 'GANGNAM', 'SEODAEMUN'));

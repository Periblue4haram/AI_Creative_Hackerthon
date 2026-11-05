# AI 일기 백엔드

Spring Boot 4, Java 25, MySQL. API 계약과 스키마는 [`.scratch/ai-diary`](../.scratch/ai-diary/)에 있다.

## 실행

프로젝트 루트에 `.env`를 만들고(`.env.example` 참고), MySQL에 DB를 만든 뒤 실행한다.

```sql
CREATE DATABASE ai_diary CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
```

```bash
mvn spring-boot:run
```

테이블은 시작할 때 Flyway가 만든다. 기본 주소는 `http://localhost:8080/api/v1`이다.

## 테스트

로컬 MySQL에 `ai_diary_test` DB를 자동으로 만들어 쓴다. `.env`의 `DB_USERNAME`, `DB_PASSWORD`를 사용하며 외부 서비스는 호출하지 않는다.

```bash
mvn test
```

실제 키로 Gemini, Cloudflare Workers AI, 네이버, SMTP 로그인을 확인한다. 사용량이 발생하며 메일은 보내지 않는다. `CLOUDFLARE_API_TOKEN`이 비어 있으면 그림체 변환 확인은 건너뛴다. PowerShell에서는 인자를 따옴표로 감싼다.

```bash
mvn test "-Dtest=LiveSmokeTest" "-Dlive.smoke=true"
```

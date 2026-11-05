package com.aidiary.auth;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
public class VerificationMailSender {

    private static final Logger log = LoggerFactory.getLogger(VerificationMailSender.class);

    private final JavaMailSender mailSender;
    private final AppProperties props;

    public VerificationMailSender(JavaMailSender mailSender, AppProperties props) {
        this.mailSender = mailSender;
        this.props = props;
    }

    public void send(String email, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(props.mailFrom());
        message.setTo(email);
        message.setSubject("[AI 일기] 이메일 인증 코드");
        message.setText("인증 코드: " + code + "\n\n10분 안에 입력해 주세요. 직접 요청하지 않았다면 이 메일을 무시해 주세요.");
        try {
            mailSender.send(message);
        } catch (MailException e) {
            log.error("인증 메일 발송 실패: {}", e.getMessage());
            throw new ApiException(ErrorCode.EMAIL_SEND_FAILED);
        }
    }
}

package com.aidiary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aidiary.common.ApiException;
import com.aidiary.common.ErrorCode;
import com.aidiary.common.Times;
import com.aidiary.image.PhotoProcessor;
import com.aidiary.image.ProcessedPhoto;
import com.drew.imaging.ImageMetadataReader;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import javax.imageio.ImageIO;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;

class PhotoProcessorTest {

    private final PhotoProcessor processor = new PhotoProcessor();

    @Test
    void readsExifAndRemovesItFromStoredFile() throws Exception {
        byte[] source = TestPhotos.exifJpeg(40, 30, "2026:11:07 14:30:00", 37.5563, 126.9246, 1);

        // 준비한 파일에 EXIF가 실제로 들어 있어야 제거 검증이 의미가 있다
        Metadata before = ImageMetadataReader.readMetadata(new ByteArrayInputStream(source));
        assertThat(before.getFirstDirectoryOfType(GpsDirectory.class)).isNotNull();

        ProcessedPhoto photo = processor.process(source);

        assertThat(photo.takenAt()).isEqualTo(LocalDateTime.of(2026, 11, 7, 14, 30));
        assertThat(photo.latitude()).isCloseTo(37.5563, Offset.offset(0.0001));
        assertThat(photo.longitude()).isCloseTo(126.9246, Offset.offset(0.0001));

        Metadata after = ImageMetadataReader.readMetadata(new ByteArrayInputStream(photo.jpeg()));
        assertThat(after.getFirstDirectoryOfType(GpsDirectory.class)).isNull();
        assertThat(after.getFirstDirectoryOfType(ExifSubIFDDirectory.class)).isNull();
    }

    @Test
    void appliesOrientationBeforeRemovingExif() throws Exception {
        byte[] source = TestPhotos.exifJpeg(40, 30, "2026:11:07 14:30:00", 37.5, 127.0, 6);

        BufferedImage stored = ImageIO.read(new ByteArrayInputStream(processor.process(source).jpeg()));

        assertThat(stored.getWidth()).isEqualTo(30);
        assertThat(stored.getHeight()).isEqualTo(40);
    }

    @Test
    void shrinksLargePhotos() throws Exception {
        BufferedImage stored = ImageIO.read(
                new ByteArrayInputStream(processor.process(TestPhotos.plainJpeg(4096, 2048)).jpeg()));

        assertThat(stored.getWidth()).isEqualTo(2048);
        assertThat(stored.getHeight()).isEqualTo(1024);
    }

    @Test
    void photoWithoutExifHasNoMetadata() {
        ProcessedPhoto photo = processor.process(TestPhotos.plainJpeg());

        assertThat(photo.takenAt()).isNull();
        assertThat(photo.hasLocation()).isFalse();
    }

    @Test
    void rejectsNonImages() {
        assertThatThrownBy(() -> processor.process("not an image".getBytes()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.code).isEqualTo(ErrorCode.UNSUPPORTED_IMAGE_TYPE));
    }

    @Test
    void dayStartsAtFiveAm() {
        assertThat(Times.logicalDate(LocalDateTime.of(2026, 11, 7, 3, 0))).isEqualTo(LocalDate.of(2026, 11, 6));
        assertThat(Times.logicalDate(LocalDateTime.of(2026, 11, 7, 4, 59))).isEqualTo(LocalDate.of(2026, 11, 6));
        assertThat(Times.logicalDate(LocalDateTime.of(2026, 11, 7, 5, 0))).isEqualTo(LocalDate.of(2026, 11, 7));
    }
}

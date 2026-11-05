package com.aidiary.ai;

import static org.assertj.core.api.Assertions.assertThat;

import com.aidiary.ai.CloudflareImageStyler.Size;
import org.junit.jupiter.api.Test;

class CloudflareImageStylerTest {

    @Test
    void sizeWithinRangeIsKeptRoundedTo16() {
        assertThat(CloudflareImageStyler.requestSize(640, 480)).isEqualTo(new Size(640, 480));
        assertThat(CloudflareImageStyler.requestSize(1000, 750)).isEqualTo(new Size(1008, 752));
    }

    @Test
    void largePhotosAreScaledDownKeepingRatio() {
        assertThat(CloudflareImageStyler.requestSize(2048, 1536)).isEqualTo(new Size(1920, 1440));
        assertThat(CloudflareImageStyler.requestSize(1536, 2048)).isEqualTo(new Size(1440, 1920));
    }

    @Test
    void smallPhotosAreScaledUpToMinimum() {
        assertThat(CloudflareImageStyler.requestSize(200, 100)).isEqualTo(new Size(512, 256));
    }

    @Test
    void extremeRatiosStayInsideLimits() {
        Size size = CloudflareImageStyler.requestSize(2048, 100);
        assertThat(size.width()).isBetween(256, 1920);
        assertThat(size.height()).isBetween(256, 1920);
    }
}

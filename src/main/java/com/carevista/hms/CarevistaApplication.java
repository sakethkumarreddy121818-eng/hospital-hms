package com.carevista.hms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class CarevistaApplication {

    public static void main(String[] args) {
        SpringApplication.run(CarevistaApplication.class, args);
    }
}

import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,

      exceptionFactory: (errors: ValidationError[]) => {
        const details = errors.flatMap((error) => {
          const field = error.property;
          const constraints = error.constraints ?? {};

          return Object.values(constraints).map((message) => ({
            field,
            reason: message,
          }));
        });

        return new BadRequestException({
          message: 'Validation failed',
          details,
        });
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new SuccessResponseInterceptor());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

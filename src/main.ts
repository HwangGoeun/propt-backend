import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { json, NextFunction, Request, Response } from 'express';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser
  });

  // Custom body parser that preserves raw body for MCP routes
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/mcp/messages')) {
      // For MCP messages, store raw body
      let data = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        data += chunk;
      });
      req.on('end', () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (req as any).rawBody = data;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          req.body = JSON.parse(data);
        } catch {
          req.body = {};
        }
        next();
      });
    } else {
      // For other routes, use standard JSON parser
      json()(req, res, next);
    }
  });

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

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

  const swaggerUser = process.env.SWAGGER_USER;
  const swaggerPassword = process.env.SWAGGER_PASSWORD;
  const enableSwagger = process.env.NODE_ENV !== 'production' && swaggerUser && swaggerPassword;

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Propt API')
      .setDescription('Propt Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);

    app.use(
      '/api/docs',
      basicAuth({
        users: { [swaggerUser]: swaggerPassword },
        challenge: true,
      }),
    );

    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const exception_filter_1 = require("./common/filters/exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const middleware_1 = require("./common/middleware");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug'],
    });
    app.enableCors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        errorHttpStatusCode: 400,
        skipMissingProperties: true,
    }));
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor(), new logging_interceptor_1.LoggingInterceptor());
    app.useGlobalFilters(new exception_filter_1.AllExceptionsFilter());
    app.use(middleware_1.RateLimitMiddleware);
    app.use(middleware_1.TenantIsolationMiddleware);
    app.setGlobalPrefix('api/v1', {
        exclude: [{ path: '/', method: common_1.RequestMethod.GET }],
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle(process.env.SWAGGER_TITLE || 'SocietyOS API')
        .setDescription(process.env.SWAGGER_DESCRIPTION ||
        'Multi-tenant residential society management platform')
        .setVersion(process.env.SWAGGER_VERSION || '1.0.0')
        .addTag('SocietyOS')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(process.env.PORT ?? 5050);
    console.log(`🚀 SocietyOS Backend running on ${await app.getUrl()}`);
    console.log(`📖 Swagger documentation available at /api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map
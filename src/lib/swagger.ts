import { createSwaggerSpec } from "next-swagger-doc";

export const getApiDocs = async () => {
    const spec = createSwaggerSpec({
        apiFolder: "src/app/api", // define api folder
        definition: {
            openapi: "3.0.0",
            info: {
                title: "SwitchCV API",
                version: "1.0.0",
                description: "API documentation for SwitchCV - AI-powered Resume Builder",
                contact: {
                    name: "SwitchCV Support",
                    email: "support@switchcv.com"
                }
            },
            components: {
                securitySchemes: {
                    BearerAuth: {
                        type: "http",
                        scheme: "bearer",
                        bearerFormat: "JWT",
                    },
                },
            },
            security: [],
        },
    });
    return spec;
};

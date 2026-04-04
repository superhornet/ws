import type { JsonObject } from "swagger-ui-express";

export const swaggerDocument: JsonObject = {
    openapi: "3.0.3",
    info: {
        title: "WeStack API",
        description: "Backend API for StackIt.cash — a fintech application for managing stacks and substacks.",
        version: "1.0.0",
        contact: {
            url: "https://github.com/superhornet/ws"
        }
    },
    servers: [
        {
            url: "/",
            description: "Current server"
        }
    ],
    components: {
        schemas: {
            StandardResponse: {
                type: "object",
                properties: {
                    code: { type: "integer", example: 200 },
                    data: { nullable: true },
                    message: { type: "string", example: "OK" }
                }
            },
            SessionBody: {
                type: "object",
                required: ["session"],
                properties: {
                    session: { type: "string", format: "uuid", description: "Session UUID" }
                }
            },
            UserBody: {
                type: "object",
                required: ["session", "firstname", "lastname", "email", "address1", "city", "state", "level"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    message: { type: "string" },
                    identifier: { type: "string", format: "uuid" },
                    firstname: { type: "string", example: "John" },
                    lastname: { type: "string", example: "Doe" },
                    email: { type: "string", format: "email", example: "john@example.com" },
                    address1: { type: "string", example: "123 Main St" },
                    address2: { type: "string", example: "Apt 4" },
                    city: { type: "string", example: "Tampa" },
                    state: { type: "string", example: "FL" },
                    level: { type: "string", enum: ["Free", "Basic", "Pro"], example: "Free" }
                }
            },
            AuditBody: {
                type: "object",
                required: ["message", "session"],
                properties: {
                    message: { type: "string", example: "User logged in" },
                    session: { type: "string", format: "uuid" }
                }
            },
            NotificationBody: {
                type: "object",
                required: ["session", "message"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    identifier: { type: "string", format: "uuid" },
                    message: { type: "string", example: "Your transfer completed." }
                }
            },
            NotificationListBody: {
                type: "object",
                required: ["session", "identifier"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    identifier: { type: "string", format: "uuid" }
                }
            },
            NotificationUpdateBody: {
                type: "object",
                required: ["session"],
                properties: {
                    session: { type: "string", format: "uuid" }
                }
            },
            StackBody: {
                type: "object",
                required: ["session", "ownerIdentifier", "stackName"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    ownerIdentifier: { type: "string", format: "uuid" },
                    stackName: { type: "string", example: "Savings" },
                    createdBy: { type: "integer", example: 1 }
                }
            },
            StackListBody: {
                type: "object",
                required: ["session", "ownerIdentifier"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    ownerIdentifier: { type: "string", format: "uuid" }
                }
            },
            StackUpdateBody: {
                type: "object",
                required: ["session", "id", "stackName"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    id: { type: "integer", example: 1 },
                    stackName: { type: "string", example: "Renamed Stack" }
                }
            },
            StackDeleteBody: {
                type: "object",
                required: ["session", "id"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    id: { type: "integer", example: 1 }
                }
            },
            SubStackBody: {
                type: "object",
                required: ["session", "stackIdentifier", "substackName", "createdBy", "usersList"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    stackIdentifier: { type: "string", format: "uuid" },
                    substackName: { type: "string", example: "Emergency Fund" },
                    createdBy: { type: "integer", example: 1 },
                    usersList: { type: "string", example: "1,2" }
                }
            },
            SubStackListBody: {
                type: "object",
                required: ["session"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    stackIdentifier: { type: "string", format: "uuid", description: "Filter by stack ID" },
                    substackName: { type: "string", description: "Filter by substack name" },
                    createdBy: { type: "integer", description: "Filter by owner ID" }
                }
            },
            SubStackUpdateBody: {
                type: "object",
                required: ["session", "id", "substackName"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    id: { type: "integer", example: 1 },
                    substackName: { type: "string", example: "Renamed SubStack" }
                }
            },
            SubStackDeleteBody: {
                type: "object",
                required: ["session", "id"],
                properties: {
                    session: { type: "string", format: "uuid" },
                    id: { type: "integer", example: 1 }
                }
            }
        }
    },
    paths: {
        "/health": {
            get: {
                tags: ["Health"],
                summary: "Health check",
                description: "Returns 200 if the server is running.",
                responses: {
                    "200": {
                        description: "Server is healthy",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/reset": {
            get: {
                tags: ["Health"],
                summary: "Reset database (dev only)",
                description: "Drops and recreates all tables with seed data using SQLite. For development use only.",
                responses: {
                    "200": {
                        description: "Database reset successful",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "500": {
                        description: "Server error",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/session": {
            get: {
                tags: ["Session"],
                summary: "Create a session",
                description: "Creates a new session and returns a session UUID with an OTP.",
                responses: {
                    "200": {
                        description: "Session created",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "500": {
                        description: "Server error",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            delete: {
                tags: ["Session"],
                summary: "Delete a session",
                description: "Kills the current session.",
                responses: {
                    "204": {
                        description: "Session deleted"
                    },
                    "500": {
                        description: "Server error",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/user": {
            post: {
                tags: ["User"],
                summary: "Create a user",
                description: "Creates a new user. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/UserBody" } } }
                },
                responses: {
                    "201": {
                        description: "User created",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            get: {
                tags: ["User"],
                summary: "Get a user",
                description: "Fetches a user by their identifier. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["session", "identifier"],
                                properties: {
                                    session: { type: "string", format: "uuid" },
                                    identifier: { type: "string", format: "uuid" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "200": {
                        description: "User data returned",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            put: {
                tags: ["User"],
                summary: "Update a user",
                description: "Updates user details. Requires a valid session and user identifier.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/UserBody" } } }
                },
                responses: {
                    "202": {
                        description: "User updated",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            delete: {
                tags: ["User"],
                summary: "Delete a user",
                description: "Soft-deletes a user by setting deleted=TRUE. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                required: ["session", "identifier"],
                                properties: {
                                    session: { type: "string", format: "uuid" },
                                    identifier: { type: "string", format: "uuid" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    "204": {
                        description: "User deleted"
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/audit": {
            post: {
                tags: ["Audit"],
                summary: "Create an audit entry",
                description: "Logs an audit message tied to a session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/AuditBody" } } }
                },
                responses: {
                    "201": {
                        description: "Audit entry created",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/notification": {
            post: {
                tags: ["Notification"],
                summary: "Create a notification",
                description: "Creates a notification for a user. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationBody" } } }
                },
                responses: {
                    "201": {
                        description: "Notification created",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/notification/{id}": {
            put: {
                tags: ["Notification"],
                summary: "Mark notification as seen",
                description: "Marks a specific notification as seen by its ID.",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer" },
                        description: "Notification ID"
                    }
                ],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationUpdateBody" } } }
                },
                responses: {
                    "202": {
                        description: "Notification marked as seen",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            delete: {
                tags: ["Notification"],
                summary: "Delete a notification",
                description: "Marks a specific notification as deleted by its ID.",
                parameters: [
                    {
                        name: "id",
                        in: "path",
                        required: true,
                        schema: { type: "integer" },
                        description: "Notification ID"
                    }
                ],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationUpdateBody" } } }
                },
                responses: {
                    "204": {
                        description: "Notification deleted"
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/notifications": {
            get: {
                tags: ["Notification"],
                summary: "List notifications for a user",
                description: "Retrieves all notifications for a specific user by their identifier.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationListBody" } } }
                },
                responses: {
                    "200": {
                        description: "Notifications returned",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/stack": {
            post: {
                tags: ["Stack"],
                summary: "Create a stack",
                description: "Creates a new stack for a user. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/StackBody" } } }
                },
                responses: {
                    "201": {
                        description: "Stack created",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            put: {
                tags: ["Stack"],
                summary: "Update a stack name",
                description: "Renames a stack by its ID. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/StackUpdateBody" } } }
                },
                responses: {
                    "202": {
                        description: "Stack updated",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            delete: {
                tags: ["Stack"],
                summary: "Delete a stack",
                description: "Deletes a stack by its ID. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/StackDeleteBody" } } }
                },
                responses: {
                    "204": {
                        description: "Stack deleted"
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/stacks": {
            get: {
                tags: ["Stack"],
                summary: "List stacks for a user",
                description: "Retrieves all stacks belonging to a user by their owner identifier.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/StackListBody" } } }
                },
                responses: {
                    "200": {
                        description: "Stacks returned",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/substack": {
            post: {
                tags: ["SubStack"],
                summary: "Create a substack",
                description: "Creates a new substack within a stack. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/SubStackBody" } } }
                },
                responses: {
                    "201": {
                        description: "SubStack created",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            put: {
                tags: ["SubStack"],
                summary: "Update a substack name",
                description: "Renames a substack by its ID. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/SubStackUpdateBody" } } }
                },
                responses: {
                    "202": {
                        description: "SubStack updated",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            },
            delete: {
                tags: ["SubStack"],
                summary: "Delete a substack",
                description: "Deletes a substack by its ID. Requires a valid session.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/SubStackDeleteBody" } } }
                },
                responses: {
                    "204": {
                        description: "SubStack deleted"
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        },
        "/api/substacks": {
            get: {
                tags: ["SubStack"],
                summary: "List substacks",
                description: "Retrieves substacks filtered by stack identifier, substack name, or owner ID. Provide one of: stackIdentifier, substackName, or createdBy.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/SubStackListBody" } } }
                },
                responses: {
                    "200": {
                        description: "SubStacks returned",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "400": {
                        description: "Empty JSON body",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    },
                    "403": {
                        description: "Session ID required",
                        content: { "application/json": { schema: { $ref: "#/components/schemas/StandardResponse" } } }
                    }
                }
            }
        }
    },
    tags: [
        { name: "Health", description: "Server health and dev utilities" },
        { name: "Session", description: "Session management" },
        { name: "User", description: "User CRUD operations" },
        { name: "Audit", description: "Audit logging" },
        { name: "Notification", description: "User notifications" },
        { name: "Stack", description: "Stack management (core domain)" },
        { name: "SubStack", description: "SubStack management within stacks" }
    ]
};

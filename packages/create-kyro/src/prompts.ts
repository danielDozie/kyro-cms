import prompts from "prompts";
import { validateProjectName } from "./validators.js";

export interface Answers {
  projectName: string;
  database: "sqlite" | "postgres" | "mongodb";
  template: "minimal" | "starter" | "blog" | "ecommerce" | "kitchen-sink";
  adminEmail: string;
}

export async function promptUser(): Promise<Answers> {
  const response = await prompts(
    [
      {
        type: "text",
        name: "projectName",
        message: "Project name:",
        initial: "my-kyro-app",
        validate: validateProjectName,
      },
      {
        type: "select",
        name: "database",
        message: "Database:",
        hint: " ",
        choices: [
          {
            title: "SQLite (local-first, zero config)",
            description:
              "Best for development and small projects. No setup required.",
            value: "sqlite",
          },
          {
            title: "PostgreSQL",
            description: "Recommended for production. Robust and scalable.",
            value: "postgres",
          },
          {
            title: "MongoDB",
            description: "Best for flexible, document-based schemas.",
            value: "mongodb",
          },
        ],
      },
      {
        type: "select",
        name: "template",
        message: "Starting template:",
        hint: " ",
        initial: 0,
        choices: [
          {
            title: "Minimal",
            description:
              "Single Posts collection — just title & content. Perfect for getting started fast.",
            value: "minimal",
          },
          {
            title: "Starter",
            description:
              "Pages, Posts, Categories, Menu + core settings. Great for blogs and small sites.",
            value: "starter",
          },
          {
            title: "Blog",
            description:
              "Posts, categories, media library + all settings. Full blog setup.",
            value: "blog",
          },
          {
            title: "E-commerce",
            description:
              "Products, orders, customers, coupons + all settings. Online store ready.",
            value: "ecommerce",
          },
          {
            title: "Kitchen Sink",
            description:
              "Everything: all collections + all settings. Maximum feature set.",
            value: "kitchen-sink",
          },
        ],
      },
      {
        type: "text",
        name: "adminEmail",
        message: "Admin email:",
        initial: (prev, values) => `admin@${values.projectName}.local`,
      },
    ],
    {
      onCancel: () => {
        process.exit(1);
      },
    },
  );

  return response as Answers;
}

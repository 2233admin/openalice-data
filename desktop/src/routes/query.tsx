import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundPage } from "./playground";

export { PlaygroundPage };

export const Route = createFileRoute("/query")({ component: PlaygroundPage });

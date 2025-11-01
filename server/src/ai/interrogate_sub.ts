// AI disabled by default — scaffolding only.
import { db } from "../db"; // adjust to your db path
// import { OpenAI } from "openai"; // disabled

export async function queryDB(_naturalQuery: string) {
  // TODO: implement NL → SQL when ChatGPT is enabled.
  // For now, return empty array so the route runs without keys.
  return [];
}

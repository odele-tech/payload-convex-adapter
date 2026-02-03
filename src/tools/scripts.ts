/**
 * @fileoverview Convex CLI Script Utilities
 *
 * This module provides utility functions for running Convex CLI commands
 * programmatically. These functions spawn child processes to run the
 * Convex development server and deployment commands.
 *
 * @module utils/scripts
 */

import { spawn } from "node:child_process";

/**
 * Runs the Convex development server.
 *
 * Spawns `pnpm dlx convex dev` as a child process with inherited stdio,
 * allowing the Convex dev server output to be displayed in the terminal.
 *
 * @returns {ChildProcess} The spawned child process
 *
 * @example
 * ```typescript
 * const devServer = runConvexDev();
 * // Convex dev server is now running
 *
 * // To stop:
 * devServer.kill();
 * ```
 */
export function runConvexDev() {
  console.log("runConvexDev");
  const term = spawn("pnpm", ["dlx", "convex", "dev"], {
    stdio: "inherit",
    shell: true,
  });

  term.on("spawn", () => {
    console.log("Convex dev server started");
  });

  term.on("close", (code) => {
    console.log("Convex dev server closed with code", code);
  });

  return term;
}

/**
 * Logs a test message to the console.
 *
 * Simple utility function for testing and debugging.
 *
 * @param {Object} options - Options object
 * @param {string} [options.text="Hello, world!"] - The text to log
 */
export function logTest({ text = "Hello, world!" }: { text?: string } = {}) {
  console.log(text);
}

/**
 * Deploys to Convex production.
 *
 * Spawns `pnpm dlx convex deploy` as a child process with inherited stdio,
 * allowing the deployment output to be displayed in the terminal.
 *
 * @returns {ChildProcess} The spawned child process
 *
 * @example
 * ```typescript
 * const deployment = runConvexProd();
 * // Convex deployment is running
 * ```
 */
export function runConvexProd() {
  const term = spawn("pnpm", ["dlx", "convex", "deploy"], {
    stdio: "inherit",
    shell: true,
  });

  term.on("spawn", () => {
    console.log("Convex prod server started");
  });

  term.on("close", (code) => {
    console.log("Convex prod server closed with code", code);
  });

  return term;
}

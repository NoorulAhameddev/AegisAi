import { Tool } from "./index";
import { CalculatorTool as SharedCalculator } from "../../tools/calculator";

export const CalculatorTool: Tool = {
  name: "calculator",
  description: SharedCalculator.description,
  parameters: SharedCalculator.parameters,
  execute: SharedCalculator.execute,
};

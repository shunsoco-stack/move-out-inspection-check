export { default } from "../../../page";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ id: "_shell" }];
}

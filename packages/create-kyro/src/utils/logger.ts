import { cyan, green, yellow, red, bold, dim } from 'kolorist';

let stepCounter = 0;

export const logger = {
  intro(name: string, version: string) {},
  error(msg: string) {},
  success(msg: string) {},
  warning(msg: string) {},
  info(msg: string) {},
  step(num: number, total: number, label: string) {},
  section(title: string) {},
  title(msg: string) {},
  list(items: string[]) {},
  done() {},
  confirm(msg: string) {},
};

// TypeScript users only add this code
import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
import { Range } from "slate";

type CustomElement = {
  type: string;
  children: (CustomText | CustomElement)[];
  content?: string;
};
type CustomText = { text: string; [type: string]: string; flag?: string };

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: CustomElement;
    Text: CustomText;
    Range: Range & { type?: string };
  }
}

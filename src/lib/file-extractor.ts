import type Anthropic from "@anthropic-ai/sdk";

type BetaMessage = Anthropic.Beta.BetaMessage;

interface FileRef {
  file_id: string;
}

export function extractFileIds(response: BetaMessage): string[] {
  const fileIds: string[] = [];

  for (const item of response.content) {
    if (
      "type" in item &&
      item.type === "bash_code_execution_tool_result"
    ) {
      const contentItem = (item as unknown as Record<string, unknown>).content as {
        type: string;
        content?: FileRef[];
      };
      if (
        contentItem?.type === "bash_code_execution_result" &&
        Array.isArray(contentItem.content)
      ) {
        for (const file of contentItem.content) {
          if (file.file_id) {
            fileIds.push(file.file_id);
          }
        }
      }
    }
  }

  return fileIds;
}

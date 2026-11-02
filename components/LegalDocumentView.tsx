import React, { useMemo } from "react";
import { Text, View } from "react-native";

type Piece =
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "sub"; text: string }
  | { type: "label"; text: string }
  | { type: "sign"; text: string }
  | { type: "join"; text: string };

type Section = {
  number: string;
  title: string;
  pieces: Piece[];
};

type ParsedDocument = {
  metas: { label: string; value: string }[];
  intro: Piece[];
  sections: Section[];
};

const META_RE = /^(Effective Date|Last Updated)\s*:\s*(.+)$/i;
const SECTION_RE = /^(\d{1,2})\.\s+(.+)$/;
const SUB_RE = /^([A-Z])\.\s+(.+)$/;
const BULLET_RE = /^[•\-*]\s*(.+)$/;
const FIELD_RE = /^(Email|Gym Name|Owner\/Authorized Person|Address|Contact|Name|Signature|Date)\s*:/;

function isSectionLine(line: string): { number: string; title: string } | null {
  const match = line.match(SECTION_RE);
  if (!match) return null;
  const title = match[2].trim();
  if (title.length > 80 || title.includes(". ") || /[,;]$/.test(title)) return null;
  return { number: match[1], title };
}

function isSubLine(line: string): string | null {
  const match = line.match(SUB_RE);
  if (!match) return null;
  const title = match[2].trim();
  if (title.length > 72 || /[.!;]$/.test(title)) return null;
  return `${match[1]}. ${title}`;
}

function pushPiece(target: Piece[], piece: Piece) {
  if (piece.type === "bullets") {
    const last = target[target.length - 1];
    if (last?.type === "bullets") {
      last.items.push(...piece.items);
      return;
    }
  }
  target.push(piece);
}

function pushParagraph(target: Piece[], text: string) {
  const last = target[target.length - 1];
  if (last?.type === "bullets") {
    const lastItem = last.items[last.items.length - 1];
    if (lastItem?.endsWith(":")) {
      last.items[last.items.length - 1] = `${lastItem}\n${text}`;
      return;
    }
  }
  pushPiece(target, { type: "p", text });
}

export function parseLegalDocument(raw: string): ParsedDocument {
  const lines = raw.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const metas: ParsedDocument["metas"] = [];
  const intro: Piece[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;
  let skippedTitle = false;

  const target = () => (current ? current.pieces : intro);

  for (const line of lines) {
    if (!skippedTitle && /^ZONOFIT\b/i.test(line)) {
      skippedTitle = true;
      continue;
    }
    skippedTitle = true;

    const meta = line.match(META_RE);
    if (meta && !current) {
      metas.push({ label: meta[1], value: meta[2] });
      continue;
    }

    const section = isSectionLine(line);
    if (section) {
      current = { number: section.number, title: section.title, pieces: [] };
      sections.push(current);
      continue;
    }

    if (line === "SIGNATURES") {
      current = { number: "", title: line, pieces: [] };
      sections.push(current);
      continue;
    }

    if (line === "and" || line === "or") {
      pushPiece(target(), { type: "join", text: line });
      continue;
    }

    const sub = isSubLine(line);
    if (sub) {
      pushPiece(target(), { type: "sub", text: sub });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      pushPiece(target(), { type: "bullets", items: [bullet[1]] });
      continue;
    }

    if (/^[A-Z0-9][A-Z0-9 &/'-]{6,}$/.test(line) && !/[a-z]/.test(line)) {
      pushPiece(target(), { type: "label", text: line });
      continue;
    }

    if (/^For\s+\S/.test(line) && line.length < 80 && !line.endsWith(".")) {
      pushPiece(target(), { type: "label", text: line });
      continue;
    }

    if (FIELD_RE.test(line) || line.includes("____")) {
      pushPiece(target(), { type: "sign", text: line });
      continue;
    }

    if (line.endsWith(":") && line.length < 90 && !line.includes(". ")) {
      pushPiece(target(), { type: "label", text: line });
      continue;
    }

    pushParagraph(target(), line);
  }

  return { metas, intro, sections };
}

function BulletList({ items }: { items: string[] }) {
  return (
    <View style={{ gap: 8 }}>
      {items.map((item, index) => {
        const [lead, ...rest] = item.split("\n");
        return (
          <View key={`${index}-${lead.slice(0, 24)}`} className="flex-row items-start">
            <View className="w-1.5 h-1.5 rounded-full mt-[8px] mr-2.5 bg-[#1F7A3E]" />
            <View className="flex-1">
              <Text className={`text-[14px] leading-6 ${rest.length > 0 ? "font-semibold text-gray-800" : "text-gray-600"}`}>
                {lead}
              </Text>
              {rest.map((line) => (
                <Text key={line} className="text-[14px] leading-6 text-gray-600 mt-0.5">
                  {line}
                </Text>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PieceBlock({ piece }: { piece: Piece }) {
  if (piece.type === "bullets") return <BulletList items={piece.items} />;
  if (piece.type === "sub") {
    return <Text className="text-[14px] font-bold text-[#14532D] mt-1">{piece.text}</Text>;
  }
  if (piece.type === "label") {
    return <Text className="text-[14px] font-bold text-gray-900 leading-6">{piece.text}</Text>;
  }
  if (piece.type === "join") {
    return <Text className="text-[13px] font-semibold text-gray-400 text-center py-0.5">{piece.text}</Text>;
  }
  if (piece.type === "sign") {
    return (
      <View className="bg-[#F8FAF8] rounded-xl px-3 py-2.5 border border-[#E5EFE8]">
        <Text className="text-[13px] leading-5 text-gray-700">{piece.text}</Text>
      </View>
    );
  }
  return <Text className="text-[14px] leading-6 text-gray-600">{piece.text}</Text>;
}

function PieceStack({ pieces }: { pieces: Piece[] }) {
  if (pieces.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      {pieces.map((piece, index) => (
        <PieceBlock key={`${piece.type}-${index}`} piece={piece} />
      ))}
    </View>
  );
}

export default function LegalDocumentView({ content }: { content: string }) {
  const doc = useMemo(() => parseLegalDocument(content), [content]);
  const hasStructure = doc.sections.length > 0 || doc.intro.length > 0;

  if (!hasStructure) {
    return (
      <View className="bg-white rounded-3xl px-4 py-4 border border-gray-200">
        <Text className="text-[14px] leading-6 text-gray-600">{content}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {doc.metas.length > 0 && (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {doc.metas.map((meta) => (
            <View key={meta.label} className="bg-white border border-[#D7EADF] rounded-full px-3 py-1.5">
              <Text className="text-[12px] text-gray-500">
                <Text className="font-bold text-[#14532D]">{meta.label}: </Text>
                {meta.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {doc.intro.length > 0 && (
        <View className="bg-white rounded-3xl px-4 py-4 border border-[#D7EADF]">
          <PieceStack pieces={doc.intro} />
        </View>
      )}

      {doc.sections.map((section) => (
        <View
          key={`${section.number}-${section.title}`}
          className="bg-white rounded-3xl px-4 py-4 border border-[#E6EEE9]"
        >
          <View className="flex-row items-start">
            {section.number ? (
              <View className="w-8 h-7 rounded-lg items-center justify-center mr-2.5 bg-[#E8F5E9]">
                <Text className="text-[12px] font-black text-[#1F7A3E]">{section.number}</Text>
              </View>
            ) : null}
            <Text className="flex-1 text-[15px] font-bold text-gray-900 leading-snug pt-0.5">
              {section.title}
            </Text>
          </View>
          {section.pieces.length > 0 && (
            <View className="mt-3">
              <PieceStack pieces={section.pieces} />
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

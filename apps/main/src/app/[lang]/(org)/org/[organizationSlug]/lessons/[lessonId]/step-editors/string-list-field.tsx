"use client";

import { Button } from "@zoonk/ui/components/button";
import { FieldDescription, FieldLegend, FieldSet } from "@zoonk/ui/components/field";
import { Input } from "@zoonk/ui/components/input";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useExtracted } from "next-intl";

function moveItem(values: string[], from: number, to: number): string[] {
  const next = [...values];
  const [moved] = next.splice(from, 1);

  if (moved !== undefined) {
    next.splice(to, 0, moved);
  }

  return next;
}

/**
 * An editable list of short texts. Rows are identified by position because
 * the values carry no ids; reordering is only offered where order is the
 * answer, such as the items of a sort question.
 */
export function StringListField({
  description,
  label,
  onChange,
  orderable = false,
  values,
}: {
  description?: string;
  label: string;
  onChange: (values: string[]) => void;
  orderable?: boolean;
  values: string[];
}) {
  const t = useExtracted();

  return (
    <FieldSet>
      <FieldLegend variant="label">{label}</FieldLegend>
      {description && <FieldDescription>{description}</FieldDescription>}

      <div className="flex flex-col gap-2">
        {values.map((value, index) => (
          // oxlint-disable-next-line react/no-array-index-key -- Plain strings have no identity; the row's position is what the learner sees.
          <div className="flex items-center gap-1" key={index}>
            <Input
              aria-label={t("{label} {number, number}", { label, number: index + 1 })}
              onChange={(event) =>
                onChange(values.map((current, at) => (at === index ? event.target.value : current)))
              }
              value={value}
            />

            {orderable && (
              <>
                <Button
                  aria-label={t("Move up")}
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(values, index, index - 1))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  aria-label={t("Move down")}
                  disabled={index === values.length - 1}
                  onClick={() => onChange(moveItem(values, index, index + 1))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ArrowDownIcon />
                </Button>
              </>
            )}

            <Button
              aria-label={t("Remove {label} {number, number}", { label, number: index + 1 })}
              onClick={() => onChange(values.filter((_, at) => at !== index))}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>
        ))}
      </div>

      <Button
        className="self-start"
        onClick={() => onChange([...values, ""])}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {t("Add")}
      </Button>
    </FieldSet>
  );
}

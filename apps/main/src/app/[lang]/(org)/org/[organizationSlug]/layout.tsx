import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@zoonk/ui/components/button";
import { Skeleton } from "@zoonk/ui/components/skeleton";
import { getExtracted } from "next-intl/server";
import { Suspense } from "react";

async function OrganizationNav({
  params,
}: Pick<LayoutProps<"/[lang]/org/[organizationSlug]">, "params">) {
  const { organizationSlug } = await params;
  const t = await getExtracted();

  return (
    <nav aria-label={t("Organization")} className="flex gap-2 px-4 pt-4">
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href={`/org/${organizationSlug}` as const}
        prefetch
      >
        {t("Team")}
      </Link>
      <Link
        className={buttonVariants({ size: "sm", variant: "outline" })}
        href={`/org/${organizationSlug}/assignments` as const}
        prefetch
      >
        {t("Assignments")}
      </Link>
    </nav>
  );
}

export default function OrganizationLayout({
  children,
  params,
}: LayoutProps<"/[lang]/org/[organizationSlug]">) {
  return (
    <div className="flex flex-col gap-2">
      <Suspense fallback={<Skeleton className="mx-4 mt-4 h-8 w-48" />}>
        <OrganizationNav params={params} />
      </Suspense>
      {children}
    </div>
  );
}

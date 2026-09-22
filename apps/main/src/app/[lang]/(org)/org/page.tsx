import { Link } from "@/i18n/navigation";
import { listCurrentUserOrganizations } from "@zoonk/core/organizations/list-current-user-organizations";
import {
  Container,
  ContainerBody,
  ContainerDescription,
  ContainerHeader,
  ContainerHeaderGroup,
  ContainerTitle,
} from "@zoonk/ui/components/container";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@zoonk/ui/components/item";
import { Skeleton } from "@zoonk/ui/components/skeleton";
import { EmptyView } from "@zoonk/ui/patterns/empty";
import { BuildingIcon } from "lucide-react";
import { type Metadata } from "next";
import { getExtracted } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getExtracted();

  return { description: t("The teams you belong to."), title: t("Organizations") };
}

async function OrganizationList() {
  const t = await getExtracted();
  const memberships = await listCurrentUserOrganizations();

  if (memberships.length === 0) {
    return (
      <EmptyView
        description={t("You are not part of a team yet.")}
        icon={BuildingIcon}
        title={t("No organizations")}
      />
    );
  }

  return (
    <ItemGroup className="divide-y">
      {memberships.map((membership) => (
        <Link
          href={`/org/${membership.organization.slug}` as const}
          key={membership.memberId}
          prefetch
        >
          <Item className="rounded-none px-0">
            <ItemContent>
              <ItemTitle>{membership.organization.name}</ItemTitle>
              <ItemDescription>{membership.role}</ItemDescription>
            </ItemContent>
          </Item>
        </Link>
      ))}
    </ItemGroup>
  );
}

export default async function OrganizationsPage() {
  const t = await getExtracted();

  return (
    <Container>
      <ContainerHeader>
        <ContainerHeaderGroup>
          <ContainerTitle>{t("Organizations")}</ContainerTitle>
          <ContainerDescription>{t("The teams you belong to.")}</ContainerDescription>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody>
        <Suspense fallback={<Skeleton className="h-24 w-full" />}>
          <OrganizationList />
        </Suspense>
      </ContainerBody>
    </Container>
  );
}

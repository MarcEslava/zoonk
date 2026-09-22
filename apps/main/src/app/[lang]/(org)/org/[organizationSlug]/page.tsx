import { listCurrentUserOrganizations } from "@zoonk/core/organizations/list-current-user-organizations";
import { listOrganizationMembers } from "@zoonk/core/organizations/list-members";
import { listOrganizationTags } from "@zoonk/core/organizations/list-tags";
import {
  Container,
  ContainerBody,
  ContainerDescription,
  ContainerHeader,
  ContainerHeaderGroup,
  ContainerTitle,
} from "@zoonk/ui/components/container";
import { Item, ItemContent, ItemTitle } from "@zoonk/ui/components/item";
import { Skeleton } from "@zoonk/ui/components/skeleton";
import { EmptyView } from "@zoonk/ui/patterns/empty";
import { TagIcon } from "lucide-react";
import { type Metadata } from "next";
import { getExtracted } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MemberTagsForm } from "./member-tags-form";

/**
 * The caller's own memberships already carry the organization, so resolving the
 * slug through them avoids a lookup that would confirm an organization exists
 * to someone who does not belong to it.
 */
async function findOrganization(organizationSlug: string) {
  const memberships = await listCurrentUserOrganizations();
  return memberships.find((membership) => membership.organization.slug === organizationSlug);
}

export async function generateMetadata({
  params,
}: PageProps<"/[lang]/org/[organizationSlug]">): Promise<Metadata> {
  const { organizationSlug } = await params;
  const membership = await findOrganization(organizationSlug);
  const t = await getExtracted();

  return { title: membership?.organization.name ?? t("Organizations") };
}

async function TeamContent({
  params,
}: Pick<PageProps<"/[lang]/org/[organizationSlug]">, "params">) {
  const { organizationSlug } = await params;
  const membership = await findOrganization(organizationSlug);

  if (!membership) {
    notFound();
  }

  const organizationId = membership.organization.id;
  const t = await getExtracted();

  const [members, tags] = await Promise.all([
    listOrganizationMembers({ organizationId }),
    listOrganizationTags({ organizationId }),
  ]);

  if (!members || !tags) {
    notFound();
  }

  if (tags.length === 0) {
    return (
      <EmptyView
        description={t("Create segments such as a territory or a role to assign training.")}
        icon={TagIcon}
        title={t("No segments yet")}
      />
    );
  }

  return (
    <div className="flex flex-col divide-y">
      {members.map((member) => (
        <Item className="flex-col items-start gap-3 rounded-none px-0" key={member.id}>
          <ItemContent>
            <ItemTitle>{member.name}</ItemTitle>
          </ItemContent>

          <MemberTagsForm
            memberId={member.id}
            memberTagIds={member.tags.map((tag) => tag.id)}
            tags={tags}
          />
        </Item>
      ))}
    </div>
  );
}

export default async function OrganizationTeamPage({
  params,
}: PageProps<"/[lang]/org/[organizationSlug]">) {
  const t = await getExtracted();

  return (
    <Container>
      <ContainerHeader>
        <ContainerHeaderGroup>
          <ContainerTitle>{t("Team")}</ContainerTitle>
          <ContainerDescription>
            {t("Move people between segments. Their assigned training follows.")}
          </ContainerDescription>
        </ContainerHeaderGroup>
      </ContainerHeader>

      <ContainerBody>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <TeamContent params={params} />
        </Suspense>
      </ContainerBody>
    </Container>
  );
}

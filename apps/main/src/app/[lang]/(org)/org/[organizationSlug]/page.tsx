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
import { findOrganization } from "./_utils/find-organization";
import { CreateTagForm } from "./create-tag-form";
import { MemberTagsForm } from "./member-tags-form";

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

  const [team, vocabulary] = await Promise.all([
    listOrganizationMembers({ organizationId }),
    listOrganizationTags({ organizationId }),
  ]);

  if (team.status !== "ready" || vocabulary.status !== "ready") {
    notFound();
  }

  const { members } = team;
  const { tags } = vocabulary;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <CreateTagForm organizationId={organizationId} />

      {tags.length === 0 ? (
        <EmptyView
          description={t("Create segments such as a territory or a role to assign training.")}
          icon={TagIcon}
          title={t("No segments yet")}
        />
      ) : (
        <div className="flex flex-col divide-y">
          {members.map((member) => (
            <Item className="flex-col items-start gap-3 rounded-none px-0" key={member.id}>
              <ItemContent>
                <ItemTitle>{member.name}</ItemTitle>
              </ItemContent>

              <MemberTagsForm
                memberId={member.id}
                memberName={member.name}
                memberTagIds={member.tags.map((tag) => tag.id)}
                tags={tags}
              />
            </Item>
          ))}
        </div>
      )}
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

import { ResultItem } from "./command";
import { jiraFetchObject, jiraUrl } from "./jira";
import { jiraImage } from "./image";
import { Color, Icon, Image } from "@raycast/api";
import { ErrorText } from "./exception";

interface IssueType {
  id: string;
  name: string;
  iconUrl: string;
}

interface IssueStatus {
  name: string;
  statusCategory: {
    key: string;
  };
}

interface Issue {
  id: string;
  key: string;
  fields: {
    summary: string;
    issuetype: IssueType;
    status: IssueStatus;
  };
}

interface Issues {
  issues?: Issue[];
}

export interface User {
  accountId: string;
  accountType: string;
  active: boolean;
  avatarUrls: {
    "48x48": string;
    "24x24": string;
    "16x16": string;
    "32x32": string;
  };
  displayName: string;
  emailAddress: string;
  key: string;
  name: string;
  self: string;
  timeZone: string;
}

const fields = "summary,issuetype,status";

function buildJql(query: string): string {
  const spaceAndInvalidChars = /[ "]/;

  const notStatusRegex = /\^!([a-z0-9_-]+|"[a-z0-9_ -]+")/gi;
  const notStatusMatchingGroup = Array.from(query.matchAll(notStatusRegex));
  const notStatuusInclFaux = notStatusMatchingGroup.map((item) => item[1].replace(/^"|"$/g, ""));
  query = query.replace(notStatusRegex, "");
  const notStatuus = notStatuusInclFaux.filter((term) => term.match(/unresolved/i) === null);
  const notResolution = notStatuus.length !== notStatuusInclFaux.length ? "resolution != Unresolved" : undefined;

  const statusRegex = /!([a-z0-9_-]+|"[a-z0-9_ -]+")/gi;
  const statusMatchingGroup = Array.from(query.matchAll(statusRegex));
  const statuusInclFaux = statusMatchingGroup.map((item) => item[1].replace(/^"|"$/g, ""));
  query = query.replace(statusRegex, "");

  const statuus = statuusInclFaux.filter((term) => term.match(/unresolved/i) === null);
  const resolution = statuus.length !== statuusInclFaux.length ? "resolution = Unresolved" : undefined;

  const notAssigneeRegex = /\^%([.@a-z0-9_-]+|"[a-z0-9_ -]+")/gi;
  const notAssigneeMatchingGroup = Array.from(query.matchAll(notAssigneeRegex));
  const notAssignee = notAssigneeMatchingGroup.map((item) => item[1].replace(/^"|"$/g, ""));
  query = query.replace(notAssigneeRegex, "");

  const assigneeRegex = /%([.@a-z0-9_-]+|"[a-z0-9_ -]+")/gi;
  const assigneeMatchingGroup = Array.from(query.matchAll(assigneeRegex));
  const assignee = assigneeMatchingGroup.map((item) => item[1].replace(/^"|"$/g, ""));
  query = query.replace(assigneeRegex, "");

  const terms = query.split(spaceAndInvalidChars).filter((term) => term.length > 0);

  const collectPrefixed = (prefix: string, terms: string[]): string[] =>
    terms
      .filter((term) => term.startsWith(prefix) && term.length > prefix.length)
      .map((term) => term.substring(prefix.length));

  const notProjects = collectPrefixed("^@", terms);
  const notIssueTypes = collectPrefixed("^#", terms);

  const projects = collectPrefixed("@", terms);
  const issueTypes = collectPrefixed("#", terms);

  const unwantedTextTermChars = /[-+!*&]/;
  const textTerms = terms
    .filter((term) => !"@#!%^".includes(term[0]))
    .flatMap((term) => term.split(unwantedTextTermChars))
    .filter((term) => term.length > 0);

  const escapeStr = (str: string) => `"${str}"`;
  const inClause = (entity: string, items: string[]) =>
    items.length > 0 ? `${entity} IN (${items.map(escapeStr)})` : undefined;
  const notInClause = (entity: string, items: string[]) => inClause(entity, items)?.replace(" IN ", " NOT IN ");

  const jqlConditions = [
    inClause("project", projects),
    inClause("issueType", issueTypes),
    inClause("status", statuus),
    inClause("assignee", assignee),
    notInClause("project", notProjects),
    notInClause("issueType", notIssueTypes),
    notInClause("status", notStatuus),
    notInClause("assignee", notAssignee),
    resolution,
    notResolution,
    ...textTerms.map((term) => `text~"${term}*"`),
  ];

  const jql = jqlConditions.filter((condition) => condition !== undefined).join(" AND ");
  return jql + " order by lastViewed desc";
}

function isIssueKey(query: string): boolean {
  const issueKeyPattern = /^[a-z]+-[0-9]+$/i;
  return query.match(issueKeyPattern) !== null;
}

function statusIcon(status: IssueStatus): Image {
  const icon = (source: Image.Source, tintColor?: Color.ColorLike) => ({
    source,
    tintColor,
  });
  switch (status.statusCategory.key) {
    case "done":
      return icon(Icon.Checkmark, Color.Green);
    case "indeterminate":
      return icon(Icon.ArrowClockwise, Color.Blue);
    default:
      return icon(Icon.Circle);
  }
}
export async function searchFromQuery(query: string): Promise<ResultItem[]> {
  const jql = buildJql(isIssueKey(query) ? `key=${query}` : query);
  console.debug(jql);
  const result = await jiraFetchObject<Issues>(
    "/rest/api/2/search",
    { jql, fields },
    { 400: ErrorText("Invalid Query", "Unknown project or issue type") },
  );
  const mapResult = async (issue: Issue): Promise<ResultItem> => ({
    id: issue.id,
    title: issue.fields.summary,
    subtitle: `${issue.key} · ${issue.fields.issuetype.name}`,
    icon: await jiraImage(issue.fields.issuetype.iconUrl),
    accessoryIcon: statusIcon(issue.fields.status),
    accessoryTitle: issue.fields.status.name,
    url: `${jiraUrl}/browse/${issue.key}`,
    linkText: `${issue.key}: ${issue.fields.summary}`,
  });
  return result.issues && result.issues.length > 0 ? Promise.all(result.issues.map(mapResult)) : [];
}

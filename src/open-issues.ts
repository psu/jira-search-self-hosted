import { SearchCommand, ResultItem } from "./command";
import { searchFromQuery, User } from "./jql";
import { jiraFetchObject } from "./jira";

async function searchOpen(query: string): Promise<ResultItem[]> {
  const myselfResult = await jiraFetchObject<User>("/rest/api/2/myself");
  return searchFromQuery(`${query} !Unresolved %${myselfResult.emailAddress}`);
}

export default function SearchMyIssueCommand() {
  return SearchCommand(searchOpen, "Search current users open issues by text, @project, #issueType and !status");
}

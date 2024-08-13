import { SearchCommand, ResultItem } from "./command";
import { searchFromQuery } from "./jql";

function searchOpen(query: string): Promise<ResultItem[]> {
  return searchFromQuery(`${query} ${assignee ? "!Unresolved %" + assignee : ""}`);
}

export default function SearchMyIssueCommand() {
  return SearchCommand(searchOpen, "Search current users open issues by text, @project, #issueType and !status");
}

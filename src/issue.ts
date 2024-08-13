import { SearchCommand, ResultItem } from "./command";
import { searchFromQuery } from "./jql";

function searchIssues(query: string): Promise<ResultItem[]> {
  return searchFromQuery(query);
}
export default function SearchIssueCommand() {
  return SearchCommand(searchIssues, "Search issues by text, @project, #issueType, !status and %assignee");
}

import { SearchCommand, ResultItem } from "./command";
import { searchFromQuery } from "./jql";

function searchPredefined(query: string): Promise<ResultItem[]> {
  return searchFromQuery(query);
}

export default function SearchIssueCommand() {
  return SearchCommand(
    searchPredefined,
    "Search issues with predefined terms combined with text, @project, #issueType, !status and %assignee",
  );
}

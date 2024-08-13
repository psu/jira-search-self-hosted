import { getPreferenceValues } from "@raycast/api";
import { SearchCommand, ResultItem } from "./command";
import { searchFromQuery } from "./jql";

const prefs: { predefined_terms: string } = getPreferenceValues();

function searchPredefined(query: string): Promise<ResultItem[]> {
  return searchFromQuery((prefs.predefined_terms ? prefs.predefined_terms + " " : "") + query);
}

export default function SearchIssueCommand() {
  return SearchCommand(
    searchPredefined,
    "Search issues with predefined terms combined with text, @project, #issueType, !status and %assignee",
  );
}

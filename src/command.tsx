import { ActionPanel, List, showToast, Action, Toast, getPreferenceValues, Keyboard, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { ErrorText } from "./exception";

export type ResultItem = List.Item.Props & {
  url: string;
  linkText?: string;
};
type SearchFunction = (query: string) => Promise<ResultItem[]>;

const prefs: { callback1: string; callback2: string; callback3: string } = getPreferenceValues();
const callbacks: string[][] = [];
callbacks.push(prefs.callback1?.split("|"));
callbacks.push(prefs.callback2?.split("|"));
callbacks.push(prefs.callback3?.split("|"));

const buildCallback = (callback: string[], url: string) => {
  if (callback[0] === "") return undefined;

  let actionUrl = callback[2];
  let actionOnOpen = async () => {
    await Clipboard.copy(url, { transient: true });
  };

  if (callback[2].includes("{url}")) {
    actionUrl = callback[2].replace("{url}", encodeURI(url));
    actionOnOpen = async () => {};
  }

  return (
    <Action.OpenInBrowser
      title={`Run '${callback[0]}'`}
      url={actionUrl}
      shortcut={{ modifiers: ["ctrl"], key: callback[1] as Keyboard.KeyEquivalent }}
      onOpen={actionOnOpen}
    />
  );
};

const markdownLink = (item: ResultItem) => `[${item.linkText ?? item.title}](${item.url})`;
const htmlLink = (item: ResultItem) => `<a href="${item.url}">${item.linkText ?? item.title}</a>`;

export function SearchCommand(search: SearchFunction, searchBarPlaceholder?: string) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ErrorText>();
  useEffect(() => {
    setError(undefined);
    setIsLoading(true);
    search(query)
      .then((resultItems) => {
        setItems(resultItems);
        setIsLoading(false);
      })
      .catch((e) => {
        setItems([]);
        console.warn(e);
        if (e instanceof Error) {
          setError(ErrorText(e.name, e.message));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [query]);

  const onSearchChange = (newSearch: string) => setQuery(newSearch);
  const buildItem = (item: ResultItem) => (
    <List.Item
      key={item.id}
      {...item}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="URL">
            <Action.OpenInBrowser url={item.url} />
            <Action.CopyToClipboard content={item.url} title="Copy URL" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Link">
            <Action.CopyToClipboard content={markdownLink(item)} title="Copy Markdown Link" />
            <Action.CopyToClipboard content={htmlLink(item)} title="Copy HTML Link" />
          </ActionPanel.Section>
          <ActionPanel.Section title="Custom Callbacks">
            {callbacks?.map((c) => buildCallback(c, item.url))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: error.name,
      message: error.message,
    });
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchChange}
      searchBarPlaceholder={searchBarPlaceholder}
      throttle
    >
      {items.map(buildItem)}
    </List>
  );
}

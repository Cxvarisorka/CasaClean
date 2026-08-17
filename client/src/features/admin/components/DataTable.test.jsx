import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "@/i18n";
import { DataTable } from "./DataTable";

/*
 * Every admin collection arrives over the network, so the table has two ways to
 * show nothing: "the API returned no rows" and "the rows aren't here yet". These
 * pin them apart — the empty state is a statement of fact and must never stand
 * in for a request still in flight.
 */

const columns = [
  { key: "name", header: "Name" },
  { key: "city", header: "City" },
];

const rows = [
  { _id: "1", name: "Ada", city: "Milan" },
  { _id: "2", name: "Giorgi", city: "Tbilisi" },
];

const renderTable = (props) =>
  render(
    <I18nProvider>
      <DataTable columns={columns} data={[]} emptyTitle="Nothing booked" {...props} />
    </I18nProvider>
  );

describe("DataTable loading state", () => {
  test("skeletons the body instead of claiming the collection is empty", () => {
    renderTable({ loading: true });

    expect(screen.queryByText("Nothing booked")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
    // The header is real data — the page knows its own columns offline — so it
    // stays put and the rows land without the layout jumping.
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(1);
  });

  test("disables the search box while there is nothing to filter", () => {
    renderTable({ loading: true });

    expect(screen.getByPlaceholderText("Search…")).toBeDisabled();
  });

  test("shows the empty state once a genuinely empty collection has arrived", () => {
    renderTable({ loading: false });

    expect(screen.getByText("Nothing booked")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search…")).toBeEnabled();
  });

  test("renders the rows once they land", () => {
    renderTable({ loading: false, data: rows });

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Tbilisi")).toBeInTheDocument();
    expect(screen.queryByText("Nothing booked")).not.toBeInTheDocument();
  });
});

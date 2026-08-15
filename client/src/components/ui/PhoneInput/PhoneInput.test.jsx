import { useState } from "react";
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhoneInput } from "./PhoneInput";

/*
 * The field is controlled, so every test drives it through a real state owner —
 * exactly how <Controller> and the profile form use it.
 */
function Harness({ initial = "" }) {
  const [value, setValue] = useState(initial);

  return (
    <>
      <PhoneInput label="Phone" countryLabel="Country code" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const numberBox = () => screen.getByLabelText("Phone");
const countryBox = () => screen.getByLabelText("Country code");
const emitted = () => screen.getByTestId("value").textContent;

describe("PhoneInput", () => {
  test("shows a stored number split into its country and its national part", () => {
    render(<Harness initial="+995555123456" />);

    expect(countryBox()).toHaveValue("GE");
    expect(numberBox()).toHaveValue("555123456");
  });

  test("emits the number with the picked country's prefix", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(numberBox(), "3312345678");

    expect(emitted()).toBe("+393312345678");
  });

  test("re-prefixes the number when the country changes", async () => {
    const user = userEvent.setup();
    render(<Harness initial="+393312345678" />);

    await user.selectOptions(countryBox(), "GE");

    expect(emitted()).toBe("+9953312345678");
  });

  // The one thing the value can't carry: with no digits typed there is no
  // prefix to read the choice back from, so the field has to remember it.
  test("keeps a country picked before any digits were typed", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.selectOptions(countryBox(), "GE");
    expect(emitted()).toBe("");
    expect(countryBox()).toHaveValue("GE");

    await user.type(numberBox(), "555123456");
    expect(emitted()).toBe("+995555123456");
  });

  test("re-points the picker when a full international number is pasted in", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(numberBox());
    await user.paste("0039 331 234 5678");

    expect(countryBox()).toHaveValue("IT");
    expect(numberBox()).toHaveValue("3312345678");
    expect(emitted()).toBe("+393312345678");
  });

  test("ignores letters and punctuation typed into the number", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(numberBox(), "331-234 5678abc");

    expect(emitted()).toBe("+393312345678");
  });

  test("an emptied number clears the whole value rather than leaving a bare prefix", async () => {
    const user = userEvent.setup();
    render(<Harness initial="+393312345678" />);

    await user.clear(numberBox());

    expect(emitted()).toBe("");
  });
});

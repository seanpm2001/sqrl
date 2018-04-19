/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  runFsCompile,
  runExecutable,
  fetchExecutableFeature
} from "./helpers/runCompile";

test("supports include statements", async () => {
  const { executable } = await runFsCompile({
    "sample.sqrl": `
    LET A := "Hello ";
      `,
    "subdir/included.sqrl": `
LET B := "world";
  `,
    "subdir/skipped.sqrl": `
LET C := "BLABLABLABAL";
  `,
    "main.sqrl": `
# Assuming we've been bad
LET IsGood := (10 > 9000);
LET IsBad := NOT IsGood;

INCLUDE "sample.sqrl";
INCLUDE "subdir/included.sqrl" WHERE IsBad;
INCLUDE "subdir/skipped.sqrl" WHERE IsGood;

LET Message := concat(
  if(A IS NULL, "", A),
  if(B IS NULL, "", B),
  if(C IS NULL, "", C)
);
LET NullMessage := concat(A, B, C);
  `
  });

  const { execution } = await runExecutable(executable);

  await expect(execution.fetchBasicByName("Message")).resolves.toEqual(
    "Hello world"
  );
  await expect(execution.fetchBasicByName("NullMessage")).resolves.toEqual(
    null
  );
  await expect(execution.fetchBasicByName("C")).resolves.toEqual(null);
});

test("supports dynamic include", async () => {
  const { executable } = await runFsCompile({
    "features/foo_action.sqrl": `
LET Thing := "from foo action";
  `,
    "features/bar_action.sqrl": `
LET Thing := "from bar action";
  `,
    "main.sqrl": `
LET Action := input();
LET Thing := "from default" DEFAULT;
INCLUDE "features/\${Action}.sqrl";
`
  });

  await expect(
    fetchExecutableFeature(executable, "Thing", {
      inputs: {
        Action: "abc_action"
      }
    })
  ).resolves.toEqual("from default");

  await expect(
    fetchExecutableFeature(executable, "Thing", {
      inputs: {
        Action: "foo_action"
      }
    })
  ).resolves.toEqual("from foo action");

  await expect(
    fetchExecutableFeature(executable, "Thing", {
      inputs: {
        Action: "bar_action"
      }
    })
  ).resolves.toEqual("from bar action");
  await expect(
    runFsCompile({
      "features/foo_action.sqrl": `
LET Thing := "from foo action";
  `,
      "main.sqrl": `
LET Action := input();
LET Sample := input();
INCLUDE "features/\${Action}.sqrl" WHERE Sample;
`
    })
  ).rejects.toThrowError(/Expected empty where clause for dynamic include/);
});

test("works with counts", async () => {
  const { sourcePrinter } = await runFsCompile({
    "x.sqrl": `
LET Count := count(BY Ip);
  `,
    "main.sqrl": `
LET Action := input();
LET Ip := input();
INCLUDE "x.sqrl" WHERE Action="x";
`
  });

  // Make sure the counter is depending on Action="x"
  expect(sourcePrinter.getSourceForSlotName("Count")).toInclude(
    'bool(Action="x":01)'
  );
});

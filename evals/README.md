# Behavioral checks

`cases.json` contains synthetic editing tasks for evaluating the skill with a real model or harness. Give the model the task and source with the skill loaded. Keep each case's `checks` out of its prompt, then assess the result against them. Record the model, skill revision, date, outputs, and observed failures in a private evaluation folder.

For voice matching, use additional user-approved samples and a separate held-out writing sample. Judge observable style and source fidelity. Do not use an AI-detector score as a success criterion.

The automated tests verify input/output validation, exact passage replacement, diff reconstruction, literal warnings, and HTTP/provider behavior with mocked responses. They do not establish that a real model consistently preserves meaning or matches a voice. These behavioral cases have not been scored against a live model as part of the automated suite.

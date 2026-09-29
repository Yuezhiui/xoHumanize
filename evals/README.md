# Behavioral checks

`cases.json` contains synthetic editing tasks for evaluating the skill with a real model or harness. Give the model the task and source with the skill loaded. Keep each case's `checks` out of its prompt, then assess the result against them. Record the model, skill revision, date, outputs, and observed failures in a private evaluation folder.

For voice matching, use additional user-approved samples and a separate held-out writing sample. Judge observable style and source fidelity. Do not use an AI-detector score as a success criterion.

When checking a reported regression, use the same input, model, generation settings, length constraint, and output format for both skill revisions. Keep the outputs before assessing them; repeat matched runs if drawing a general conclusion. Score final length, unsupported additions, voice preservation, and specific editorial problems separately. A different task, model, or word budget cannot isolate the effect of a skill change. Record user-supplied detector results as observations, without claiming a cause or sending text to a detector without permission.

The automated tests verify input/output validation, exact passage replacement, diff reconstruction, literal warnings, and HTTP/provider behavior with mocked responses. They do not establish that a real model consistently preserves meaning or matches a voice. These behavioral cases have not been scored against a live model as part of the automated suite.

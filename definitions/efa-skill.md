---
name: embedded-feature-annotation-skill
description: Create or update embedded feature annotations
---

# Feature annotation syntax

Embedded feature anotations MUST follow the following syntax.
Features can be annotated using both fragment and line syntax:

## Fragment

&begin[FeatureName]
<Feature Implementation>
&end[FeatureName]

## Line

<Feature Implementation> &line[FeatureName]

Feature names MUST be written in PascalCase.
Feature annotations MUST be written in a comment (different depending on language)
Use fragment syntax for multiple lines and line syntax for single executable statements, subject to the scope rules below.
No blank lines between feature annotations and the code it wraps.

FeatureNames should be standalone and not include any parents or children.

## Wrong implementation

&begin[Parent.Parent.Child]

## Choosing the annotation scope

Annotations MUST be placed at the smallest meaningful implementation scope:

- Do NOT annotate imports or class field and property declarations. Do not attach line annotations to them or include them in a fragment annotation.
- Do NOT attach line annotations to method declarations or signatures.
- Annotate a whole method using fragment syntax: place `&begin[FeatureName]` immediately before the method declaration and `&end[FeatureName]` immediately after its body. This also applies to single-line methods.
- Use line syntax for a single executable statement inside a method, and fragment syntax for multiple contiguous statements implementing a separate feature within the method.
- NEVER use a fragment annotation to wrap an entire class, struct, interface, enum, component, module, or other top-level declaration. In particular, do not put `&begin[FeatureName]` directly before a class declaration and `&end[FeatureName]` after the class body.
- If a complete class is the implementation of a feature, represent that relationship in `.feature-to-file` instead of placing `begin`/`end` around the class. `.feature-to-file` associates the feature with the class's file, so this is appropriate when the file can be treated as belonging to that feature.
- If a file contains multiple unrelated classes or features, do not use `.feature-to-file` for the whole file. Annotate whole methods with fragment syntax and smaller implementation blocks or statements with fragment or line syntax as appropriate.

If a whole file is related to a feature it can be annotated with a file named `.feature-to-file`. Instead of wrapping an entire file in a single feature, prefer using `.feature-to-file`.
This file should be placed in the same directory as the given file and include a feature name and the name of the file.

Example:
UserController.cs
UserManagement

For a class-level relationship, use the same file mapping and do not add an inline class wrapper.

## Shared code and session changes

Annotations describe the features implemented by the code, not which feature motivated the current session's edits.

- Inspect the surrounding implementation and existing annotations before annotating changed code. Preserve existing feature annotations and file mappings while those relationships remain valid.
- Do NOT relabel a shared method or block solely with the current feature because it was changed in this session. Include all features the annotated code actually implements, including existing responsibilities. Do not add unrelated features merely because they call the code.
- When the current feature affects only part of an existing method, retain the method's feature block and annotate the relevant statements inside it. Do not extend the current feature's annotation over unrelated code.
- When the same implementation scope implements multiple features, use a separate annotation for each feature. For a shared method or block, nest matching `&begin[FeatureName]` / `&end[FeatureName]` pairs and close them in reverse order. For a shared executable statement, use separate `&line[FeatureName]` markers in its comment. Do not combine feature names inside one marker.
- These rules do not override the exclusions for imports, class fields, and properties or the requirement to use fragment syntax for whole methods.

For example, if the current session adds or changes Google login in `authenticateUser` below, keep the `Authentication` method block and apply `GoogleIntegration` only to the relevant statement. The method still implements authentication as a whole.

## Example of code with annotations

class User {
const userId
const fullName

    constructor(userId, fullName) {
        this.userId = userId
        this.fullName = fullName
    }

    getCredentials() {
        return {
            userId: this.userId,
            token: "session-token"
        }
    }

    const bankAccountNumber
    const monthlyBaseSalary
    const absenceDaysLastMonth

    // &begin[Payroll]
    getMonthlySalary() {
        const dailyRate = this.monthlyBaseSalary / 22
        const absenceDeduction = dailyRate * this.absenceDaysLastMonth
        return this.monthlyBaseSalary - absenceDeduction
    }
    // &end[Payroll]

    // &begin[Authentication]
    function authenticateUser(user, requiredAccess, loginMethod) {
        const credentials = user.getCredentials()

        if (loginMethod === "google") credentials.provider = "google" // &line[GoogleIntegration]

        const accessPoints = getAccessPoints(requiredAccess)
        const isAuthenticated = verifyCredentials(credentials, accessPoints)

        return isAuthenticated
    }
    // &end[Authentication]

}

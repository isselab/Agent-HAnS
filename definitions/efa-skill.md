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

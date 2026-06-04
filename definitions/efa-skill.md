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
Use fragment syntax for multiple lines and line syntax for single lines. 
No blank lines between feature annotations and the code it wraps.

FeatureNames should be standalone and not include any parents or children.

## Wrong implementation
&begin[Parent.Parent.Child]


If a whole file is related to a feature it can be annotated with a file named `.feature-to-file`. Instead of wrapping an entire file in a single feature, prefer using `.feature-to-file`.
This file should be placed in the same directory as the given file and include a feature name and the name of the file.

Example:
UserController.cs
UserManagement

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
 
    // &begin[Payroll]
    const bankAccountNumber
    const monthlyBaseSalary
    const absenceDaysLastMonth
 
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

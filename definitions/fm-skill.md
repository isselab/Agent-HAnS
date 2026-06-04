---
name: feature-model-skill
description: Updates feature model based on user intent and the existing feature model
---

# Feature model syntax
The feature model reflects the logical dependencies and hierarchy between features.
The feature model MUST be created in a file called `.feature-model` in the project root.
If the `.feature-model` file doesn't exist, create it with the root feature named after the project.

Each feature is represented by its feature name in PascalCase.
An intendation represents the hierarchy between features, a child is indented one step from its parent. 
The root feature should be named after the project. 

Store
    Products
        AddProduct
        RemoveProduct
        UpdateProduct
    Staff
        ReportTime
        Authorization
    Customers
        Delivery
        Return

## Example of feature model

HumanResourcesManager
    User
        Payroll
        Authentication
    GoogleIntegration
    OtherFeature1
        ChildFeature1
    OtherFeature2
 
GoogleIntegration is a separate feature that affects the entire project, but reflects in the user authentication by only one line. Therefore it isn't a child of authentication, even though it looks like it from the feature annotations.
When removing the Authentication feature, the usual rule is to not touch other feature annotations, but in this case, it can be inferred that this line is highly linked to authentication and can therefore also be removed.

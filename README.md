> This Plugin / Repo is being maintained by a community of developers.
There is no warranty given or bug fixing guarantee; especially not by
Programmfabrik GmbH. Please use the GitHub issue tracking to report bugs
and self organize bug fixing. Feel free to directly contact the committing
developers.

# Edit info updater plugin

This is a server plugin for [fylr](https://docs.fylr.io) that updates two fields "Edited by" and "Edit date" whenever either a certain field has been changed or a tag from a certain tag group has been added or removed. Fields can optionally be located inside a nested field.

## Installation

The latest version of this plugin can be found [here](https://github.com/programmfabrik/fylr-plugin-edit-info-updater/releases/latest/download/EditInfoUpdater.zip).

The ZIP can be downloaded and installed using the plugin manager, or used directly (recommended).

## Configuration

All plugin configuration takes place in base configuration.

* *Object types*:
    * *Object type name*: The name of the object type for which the plugin should be used
    * *Fields*:
        * *Type*: Can be either "Field" (if a field should be monitored) or "Tag group" (if a tag group should be monitored)
        * *Path to parent field*: The path to the nested field that contains the field to be monitored as well as the fields "Edited by" and "Edit date" (leave empty if these fields are located on the root level of the object). Only usable for type "Field".
        * *Path to field or ID of tag group to be monitored*: If a field should be monitored, then the path to that field (starting from the level of the parent field if it is located inside a nested field) has to be entered here. If tag changes should be monitored, then the ID of the tag group that contains the respective tags has to be entered. 
        * *Name of field 'Edited by'*: The name of the field where the name of the user that made the last change should be saved. This has to be a text field.
        * *Name of field 'Edit date'*: The name of the field where the date of the last change should be saved. This has to be a field of type "Date".
        * *Filter function (JavaScript)*: Optionally, a custom JavaScript function body can be provided. The object data can be accessed via the variable "object" (e. g. "return object._id;"), containing either the object data at root level or the content of the entry of the nested parent field. The function has to return a boolean value: If it returns true, the fields "Edited by" and "Edit date" are to be updated; if it returns false, nothing is updated.

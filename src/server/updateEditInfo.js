const info = process.argv.length >= 3
    ? JSON.parse(process.argv[2])
    : {};

let input = '';
process.stdin.on('data', d => {
    try {
        input += d.toString();
    } catch (err) {
        console.error(`Could not read input into string: ${err.message}`, err.stack);
        process.exit(1);
    }
});

process.stdin.on('end', async () => {
    const data = JSON.parse(input);
    const configuration = getPluginConfiguration(data);
    const tagGroups = await getTagGroups();
    const changedObjects = [];

    for (let object of data.objects) {
        if (await processObject(object, object._current, configuration, tagGroups)) changedObjects.push(object);
    }

    console.log(JSON.stringify({ objects: changedObjects }));

    if (!changedObjects.length) {
        console.error('No changes');
        process.exit(0);
    }
});

async function processObject(object, currentObject, configuration, tagGroups) {
    let changed = false;

    for (let fieldConfiguration of getObjectConfiguration(object, configuration).fields) {
        for (let { parentField, currentParentField, objectToEdit } of getParentFields(object, currentObject, fieldConfiguration)) {
            if (hasChanged(parentField, currentParentField, fieldConfiguration, tagGroups)) {
                setEditedBy(objectToEdit, fieldConfiguration);
                setEditDate(objectToEdit, fieldConfiguration);
                changed = true;
            }
        }
    }

    return changed;
}

function getParentFields(object, currentObject, fieldConfiguration) {
    if (fieldConfiguration.type === 'tag_group') {
        return [{
            parentField: object,
            currentParentField: currentObject ?? {},
            objectToEdit: object[object._objecttype],
        }];
    } else if (!fieldConfiguration.parent_field_path?.length) {
        return [{
            parentField: object[object._objecttype],
            currentParentField: currentObject?.[object._objecttype] ?? {},
            objectToEdit: object[object._objecttype],
        }];
    } else {
        const parentFields = getFieldValues(object[object._objecttype], fieldConfiguration.parent_field_path.split('.'));
        const currentParentFields = currentObject
            ? getFieldValues(currentObject[object._objecttype], fieldConfiguration.parent_field_path.split('.'))
            : [];

        return parentFields.map(parentField => {
            return {
                parentField: parentField,
                currentParentField: currentParentFields.find(field => field._uuid === parentField._uuid) ?? {},
                objectToEdit: parentField
            };
        });
    }
}

function hasChanged(object, currentObject, fieldConfiguration, tagGroups) {
    const hasChanged = fieldConfiguration.type === 'tag_group'
        ? hasTagChanged(object, currentObject, fieldConfiguration, tagGroups)
        : hasFieldValueChanged(object, currentObject, fieldConfiguration);

    return hasChanged && (!fieldConfiguration.filter_function || runFilterFunction(object, fieldConfiguration.filter_function));
}

function hasTagChanged(object, currentObject, fieldConfiguration, tagGroups) {
    const changedTagIds = getChangedTagIds(object, currentObject);
    const groupTagIds = getTagIds(parseInt(fieldConfiguration.value_to_monitor), tagGroups);

    return groupTagIds.find(tagId => changedTagIds.includes(tagId));
}

function hasFieldValueChanged(object, currentObject, fieldConfiguration) {
    const currentFieldValues = getFieldValues(object, fieldConfiguration.value_to_monitor.split('.'));
    const editedFieldValues = getFieldValues(currentObject, fieldConfiguration.value_to_monitor.split('.'));

    return JSON.stringify(currentFieldValues) !== JSON.stringify(editedFieldValues);
}

function runFilterFunction(object, functionDefinition) {
    const filterFunction = new Function('object', functionDefinition);
    return filterFunction(object);
}

function setEditedBy(object, fieldConfiguration) {
    const userName = info.api_user.user._generated_displayname;
    object[fieldConfiguration.edited_by_field_name] = userName;
}

function setEditDate(object, fieldConfiguration) {
    object[fieldConfiguration.edit_date_field_name] = { value: getCurrentDate() };
}

function getCurrentDate() {
    const currentDate = new Date();

    return currentDate.getFullYear() + '-'
        + (currentDate.getMonth() + 1).toString().padStart(2, '0') + '-'
        + currentDate.getDate().toString().padStart(2, '0');
}

function getChangedTagIds(object, currentObject) {
    const currentTagIds = currentObject._tags.map(tag => tag._id);
    const editedTagIds = object._tags.map(tag => tag._id);

    const addedTagIds = currentTagIds.filter(tagId => !editedTagIds.includes(tagId));
    const removedTagIds = editedTagIds.filter(tagId => !currentTagIds.includes(tagId));

    return [...new Set(addedTagIds.concat(removedTagIds))];
}

function getTagIds(tagGroupId, tagGroups) {
    return tagGroups.find(group => group.taggroup._id === tagGroupId)
        ._tags.map(tag => tag.tag._id);
}

function getFieldValues(object, pathSegments) {
    const fieldName = pathSegments.shift();
    const field = object[fieldName];

    if (field === undefined) {
        return [];
    } else if (pathSegments.length === 0) {
        return Array.isArray(field) ? field : [field];
    } else if (Array.isArray(field)) {
        return field.map(entry => getFieldValues(entry, pathSegments.slice()))
            .filter(data => data !== undefined)
            .reduce((result, fieldValues) => result.concat(fieldValues), []);
    } else {
        return getFieldValues(field, pathSegments);
    }
}

function getObjectConfiguration(object, configuration) {
    return configuration.object_types.find(objectConfiguration => objectConfiguration.name === object._objecttype)
}

function getPluginConfiguration(data) {
    return data.info.config.plugin['edit-info-updater'].config.editInfoUpdater;
}

async function getTagGroups() {
    const url = info.api_url + '/api/v1/tags?access_token=' + info.api_user_access_token;

    try {
        const response = await fetch(url, { method: 'GET' });
        return await response.json();
    } catch (err) {
        throwErrorToFrontend('Die Abfrage der konfigurierten Tags ist fehlgeschlagen.', JSON.stringify(err));
    }
}

function throwErrorToFrontend(error, description, realm) {
    console.log(JSON.stringify({
        error: {
            code: 'error.editInfoUpdater',
            statuscode: 400,
            realm: realm ?? 'api',
            error,
            parameters: {},
            description
        }
    }));

    process.exit(0);
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import {
    IDiagnosticLogger, _eInternalMessageId, _throwInternal, eLoggingSeverity, getJSON, hasJSON, isObject, objForEachKey, strTrim
} from "@microsoft/applicationinsights-core-js";

export const enum DataSanitizerValues {
    /**
     * Max length allowed for custom names.
     */
    MAX_NAME_LENGTH = 150,

     /**
      * Max length allowed for Id field in page views.
      */
    MAX_ID_LENGTH = 128,
 
     /**
      * Max length allowed for custom values.
      */
    MAX_PROPERTY_LENGTH = 8192,
 
     /**
      * Max length allowed for names
      */
    MAX_STRING_LENGTH = 1024,
 
     /**
      * Max length allowed for url.
      */
    MAX_URL_LENGTH = 2048,
 
     /**
      * Max length allowed for messages.
      */
    MAX_MESSAGE_LENGTH = 32768,
 
     /**
      * Max length allowed for exceptions.
      */
    MAX_EXCEPTION_LENGTH = 32768
}

export function dataSanitizeKeyAndAddUniqueness(logger: IDiagnosticLogger, key: any, map: any) {
    const origLength = key.length;
    let field = dataSanitizeKey(logger, key);

    // validation truncated the length.  We need to add uniqueness
    if (field.length !== origLength) {
        let i = 0;
        let uniqueField = field;
        while (map[uniqueField] !== undefined) {
            i++;
            uniqueField = field.substring(0, DataSanitizerValues.MAX_NAME_LENGTH - 3) + dsPadNumber(i);
        }
        field = uniqueField;
    }
    return field;
}

export function dataSanitizeKey(logger: IDiagnosticLogger, name: any) {
    let nameTrunc: String;
    if (name) {
        // Remove any leading or trailing whitespace
        name = strTrim(name.toString());

        // truncate the string to 150 chars
        if (name.length > DataSanitizerValues.MAX_NAME_LENGTH) {
            nameTrunc = name.substring(0, DataSanitizerValues.MAX_NAME_LENGTH);
            _throwInternal(logger,
                eLoggingSeverity.WARNING,
                _eInternalMessageId.NameTooLong,
                "name is too long.  It has been truncated to " + DataSanitizerValues.MAX_NAME_LENGTH + " characters.",
                { name }, true);
        }
    }

    return nameTrunc || name;
}

export function dataSanitizeString(logger: IDiagnosticLogger, value: any, maxLength: number = DataSanitizerValues.MAX_STRING_LENGTH) {
    let valueTrunc : String;
    if (value) {
        maxLength = maxLength ? maxLength : DataSanitizerValues.MAX_STRING_LENGTH; // in case default parameters dont work
        value = strTrim(value.toString());
        if (value.length > maxLength) {
            valueTrunc = value.substring(0, maxLength);
            _throwInternal(logger,
                eLoggingSeverity.WARNING,
                _eInternalMessageId.StringValueTooLong,
                "string value is too long. It has been truncated to " + maxLength + " characters.",
                { value }, true);
        }
    }

    return valueTrunc || value;
}

export function dataSanitizeUrl(logger: IDiagnosticLogger, url: any) {
    return dataSanitizeInput(logger, url, DataSanitizerValues.MAX_URL_LENGTH, _eInternalMessageId.UrlTooLong);
}

export function dataSanitizeMessage(logger: IDiagnosticLogger, message: any) {
    let messageTrunc : String;
    if (message) {
        if (message.length > DataSanitizerValues.MAX_MESSAGE_LENGTH) {
            messageTrunc = message.substring(0, DataSanitizerValues.MAX_MESSAGE_LENGTH);
            _throwInternal(logger,
                eLoggingSeverity.WARNING, _eInternalMessageId.MessageTruncated,
                "message is too long, it has been truncated to " + DataSanitizerValues.MAX_MESSAGE_LENGTH + " characters.",
                { message },
                true);
        }
    }

    return messageTrunc || message;
}

export function dataSanitizeException(logger: IDiagnosticLogger, exception: any) {
    let exceptionTrunc : String;
    if (exception) {
        // Make surte its a string
        let value:string = "" + exception;
        if (value.length > DataSanitizerValues.MAX_EXCEPTION_LENGTH) {
            exceptionTrunc = value.substring(0, DataSanitizerValues.MAX_EXCEPTION_LENGTH);
            _throwInternal(logger,
                eLoggingSeverity.WARNING, _eInternalMessageId.ExceptionTruncated, "exception is too long, it has been truncated to " + DataSanitizerValues.MAX_EXCEPTION_LENGTH + " characters.",
                { exception }, true);
        }
    }

    return exceptionTrunc || exception;
}

export function dataSanitizeProperties(logger: IDiagnosticLogger, properties: any) {
    if (properties) {
        const tempProps = {};
        objForEachKey(properties, (prop, value) => {
            if (isObject(value) && hasJSON()) {
                // Stringify any part C properties
                try {
                    value = getJSON().stringify(value);
                } catch (e) {
                    _throwInternal(logger,eLoggingSeverity.WARNING, _eInternalMessageId.CannotSerializeObjectNonSerializable, "custom property is not valid", { exception: e}, true);
                }
            }
            value = dataSanitizeString(logger, value, DataSanitizerValues.MAX_PROPERTY_LENGTH);
            prop = dataSanitizeKeyAndAddUniqueness(logger, prop, tempProps);
            tempProps[prop] = value;
        });
        properties = tempProps;
    }

    return properties;
}

export function dataSanitizeMeasurements(logger: IDiagnosticLogger, measurements: any) {
    if (measurements) {
        const tempMeasurements = {};
        objForEachKey(measurements, (measure, value) => {
            measure = dataSanitizeKeyAndAddUniqueness(logger, measure, tempMeasurements);
            tempMeasurements[measure] = value;
        });

        measurements = tempMeasurements;
    }

    return measurements;
}

export function dataSanitizeId(logger: IDiagnosticLogger, id: string): string {
    return id ? dataSanitizeInput(logger, id, DataSanitizerValues.MAX_ID_LENGTH, _eInternalMessageId.IdTooLong).toString() : id;
}

export function dataSanitizeInput(logger: IDiagnosticLogger, input: any, maxLength: number, _msgId: _eInternalMessageId) {
    let inputTrunc : String;
    if (input) {
        input = strTrim(input.toString());
        if (input.length > maxLength) {
            inputTrunc = input.substring(0, maxLength);
            _throwInternal(logger,
                eLoggingSeverity.WARNING,
                _msgId,
                "input is too long, it has been truncated to " + maxLength + " characters.",
                { data: input },
                true);
        }
    }

    return inputTrunc || input;
}

export function dsPadNumber(num: number) {
    const s = "00" + num;
    return s.substr(s.length - 3);
}

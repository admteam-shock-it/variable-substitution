import core = require("@actions/core");

import { EnvTreeUtility } from "./envVariableUtility";

export class JsonSubstitution {
    constructor() {
        this.envTreeUtil = new EnvTreeUtility();
    }

    private isUpperCamelCase(str) {
        // console.log(isUpperCamelCase("Alice"));        // Output: true
        // console.log(isUpperCamelCase("MyString"));     // Output: true
        // console.log(isUpperCamelCase("camelCase"));    // Output: false
        // console.log(isUpperCamelCase("NotCamelCASE")); // Output: false
        // console.log(isUpperCamelCase("UPPERCASE"));    // Output: false
        return /^[A-Z](([a-z]+[A-Z]?)*)$/.test(str);
    }

    private isAtSkippedEnvList(e) {
        return ['ImageVersion'].some(i => i.toLowerCase() === e.toLowerCase());
    }

    validateAvailabilityEnviromentsInJson(jsonObject, envObject) {
        let isValidated: boolean = false;

        for (let e in envObject.child) {
            let found: boolean = false;
            console.log('[ii] e' , e);
            
            //let eSplited = e.split('.');
            //console.log('[ii] eSplited' , eSplited);
            if ( (this.isUpperCamelCase(e) && !this.isAtSkippedEnvList(e)) )
            {
                console.log('[ii] e' , e);
                for(let jsonChild in jsonObject) {
                    let jsonChildArray = jsonChild.split('.');
                    console.log('[ii] jsonChildArray' , e);
                    const isKeywordInArray = jsonChildArray.some(i => i.toLowerCase() === e.toLowerCase());
                    //const isKeywordInArray = jsonChildArray.some(i => i.toLowerCase().includes('_boo') && i.toLowerCase() === e.toLowerCase() + '_boo');

                    if (isKeywordInArray) {
                      found=true;
                      break;
                    }
                }
                if(!found) {
                    core.debug(`[!] key "${e}" ENV was NOT FOUND in jsonObjext`);
    
                    return isValidated;
                }
            }  
        }

        return !isValidated;
    }
    
    substituteJsonVariable(jsonObject, envObject) {
        let isValueChanged: boolean = false;
        for(let jsonChild in jsonObject) {
            let jsonChildArray = jsonChild.split('.');
            let resultNode = this.envTreeUtil.checkEnvTreePath(jsonChildArray, 0, jsonChildArray.length, envObject);
            if(resultNode != undefined) {
                if(resultNode.isEnd) {
                    switch(typeof(jsonObject[jsonChild])) {
                        case 'number':
                            console.log('SubstitutingValueonKeyWithNumber', jsonChild , resultNode.value);
                            jsonObject[jsonChild] = !isNaN(resultNode.value) ? Number(resultNode.value): resultNode.value;
                            break;
                        case 'boolean':
                            console.log('SubstitutingValueonKeyWithBoolean' , jsonChild , resultNode.value);
                            jsonObject[jsonChild] = (
                                resultNode.value == 'true' ? true : (resultNode.value == 'false' ? false : resultNode.value)
                            )
                            break;
                        case 'object':
                        case null:
                            try {
                                console.log('SubstitutingValueonKeyWithObject' , jsonChild , resultNode.value);
                                jsonObject[jsonChild] = JSON.parse(resultNode.value);
                            }
                            catch(exception) {
                                core.debug('unable to substitute the value. falling back to string value');
                                jsonObject[jsonChild] = resultNode.value;
                            }
                            break;
                        case 'string':
                            console.log('SubstitutingValueonKeyWithString' , jsonChild , resultNode.value);
                            jsonObject[jsonChild] = resultNode.value;
                    }
                    isValueChanged = true;
                }
                else {
                    isValueChanged = this.substituteJsonVariable(jsonObject[jsonChild], resultNode) || isValueChanged;
                }
            }
        }
        return isValueChanged;
    }

    private envTreeUtil: EnvTreeUtility;
}
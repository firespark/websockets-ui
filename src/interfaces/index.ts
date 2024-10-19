export interface reqInputInt {
    type: string,
    data: string,
    id: number,
}

export interface reqOutputInt {
    type: string,
    data: string,
    id: number,
}

export class reponse implements reqOutputInt {
    type: string;
    data: string;
    id: number;
    constructor(type: string, data: string){
        this.type = type;
        this.data = data;
        this.id = 0;
    }
}

export class regOutputData{   
    name: string;
    index: number | string;
    error: boolean;
    errorText: string;
    constructor(name: string, index: number, errorText?:string){
            this.name,
            this.index,
            this.error = errorText ? true : false,
            this.errorText
    }

}


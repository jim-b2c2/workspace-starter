import { ButtonStyle, CustomTemplateData, PlainContainerTemplateFragment, TemplateFragment, TemplateFragmentTypes } from "@openfin/workspace";
import { createButton, createContainer, createImage, createLabelledValue, createTable, createText } from "../../template-helpers";
import { FactSetTableSet, FactSetTemplateData } from "./shapes";

export function getBusyTemplate(spinnerKey: string): TemplateFragment {
    return createContainer("column", [
        createImage(spinnerKey, "Busy", { width: "100px", height: "100px" })
    ], { padding: "10px", flex: "1", alignItems: "center", justifyContent: "center" });
}

export function getTemplateAndData(template: string, templateData: FactSetTemplateData): {
    layout: TemplateFragment;
    data: CustomTemplateData
} {
    const data: { [id: string]: string } = {};
    const children: TemplateFragment[] = [];

    if (templateData.label && templateData.value) {
        data.labelValueTitle = templateData.label;
        data.labelValueData = typeof templateData.value === "string" ? templateData.value : templateData.value.text;
        children.push(createLabelledValue("labelValueTitle", "labelValueData"))
    }
    if (templateData.text) {
        data.textData = templateData.text;
        children.push(createText("textData", 12, { marginBottom: "10px" }));
    }
    if (templateData.valueChange) {
        data.valueChangeTitle = "Change";
        data.valueChangeData = templateData.valueChange.percentageChange;
        children.push(createLabelledValue("valueChangeTitle", "valueChangeData", { marginBottom: "10px" }));
    }
    if (templateData.date) {
        data.dateTitle = "Date";
        data.dateData = templateData.date;
        children.push(createLabelledValue("dateTitle", "dateData"))
    }
    if (templateData.body) {
        data.bodyData = templateData.body;
        children.push(createText("bodyData", 12, { marginBottom: "10px" }));
    }

    if (templateData.fdc3Context) {
        data.fdc3Title = "FDC3 Type";
        data.fdc3Data = templateData.fdc3Context.type;
        children.push(createLabelledValue("fdc3Title", "fdc3Data"))

        if (templateData.fdc3Context.type === "fdc3.instrument") {
            data.tickerTitle = "Ticker";
            data.tickerData = templateData.fdc3Context.id.ticker;
            children.push(createLabelledValue("tickerTitle", "tickerData"))
        }
    }

    if (template === "TableTemplate" && templateData.table) {
        children.push(processTableData(templateData.table, 0, data));
    } else if (template === "TableTableTemplate") {
        if (templateData.table1) {
            children.push(processTableData(templateData.table1, 1, data));
        }
        if (templateData.table2) {
            children.push(processTableData(templateData.table2, 2, data));
        }
    } else if (template === "RankedTableTemplate" && templateData.table) {
        let tableData = [];
        tableData.push(templateData.table.headers);

        for (let i = 0; i < templateData.table.rows.length; i++) {
            tableData.push([
                templateData.table.rows[i].rank.toString(),
                templateData.table.rows[i].entity.name,
                templateData.table.rows[i].additionalData[0]
            ]);
        }

        children.push(createTable(tableData, [1, 4, 1], 0, data));
    }

    if (templateData.list) {
        for (let i = 0; i < templateData.list.length; i++) {
            const titleKey = `listTitle${i}`;
            const dataKey = `listData${i}`;
            data[titleKey] = templateData.list[i].label;
            data[dataKey] = templateData.list[i].value;
            children.push(createLabelledValue(titleKey, dataKey))
        }
    }

    if (templateData.footer) {
        data.footerData = templateData.footer;
        children.push(createText("footerData", 12, { marginBottom: "10px", marginTop: "10px", fontStyle: "italic" }));
    }

    if (templateData.applicationLinks) {
        const buttons = [];
        for (let i = 0; i < templateData.applicationLinks.length; i++) {
            const buttonTitleKey = `buttonTitle${i}`;
            data[buttonTitleKey] = templateData.applicationLinks[i].name.length > 30 ? `${templateData.applicationLinks[i].name.substring(0, 30)}...` : templateData.applicationLinks[i].name;
            buttons.push(createButton(ButtonStyle.Primary, buttonTitleKey, `open${i}`))
        }
        children.push({
            type: TemplateFragmentTypes.Container,
            style: {
                display: "flex",
                flex: 1,
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "flex-end"
            },
            children: buttons
        });
    }

    return {
        layout: {
            type: TemplateFragmentTypes.Container,
            style: {
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: "10px"
            },
            children
        },
        data
    };
}

function processTableData(table: FactSetTableSet, tableIndex: number, data: { [id: string]: string; }) {
    let tableData = [];
    tableData.push(table.tableHeaders);
    const rows = table.tableRows ?? table.tableData;
    tableData = tableData.concat(rows);
    if (table.tableFooters?.length) {
        tableData = tableData.concat(table.tableFooters);
    }
    return createTable(tableData, [], tableIndex, data);
}


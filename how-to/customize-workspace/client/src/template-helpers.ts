import { ButtonStyle, ButtonTemplateFragment, ImageTemplateFragment, PlainContainerTemplateFragment, TemplateFragment, TemplateFragmentTypes, TextTemplateFragment } from "@openfin/workspace"
import * as CSS from "csstype";

export function createContainer(containerType: "column" | "row", children: TemplateFragment[], style?: CSS.Properties): PlainContainerTemplateFragment {
    return {
        type: TemplateFragmentTypes.Container,
        style: {
            display: "flex",
            flexDirection: containerType,
            ...style
        },
        children
    }
}

export function createText(dataKey: string, fontSize: number = 14, style?: CSS.Properties): TextTemplateFragment {
    return {
        type: TemplateFragmentTypes.Text,
        dataKey,
        style: {
            fontSize: `${fontSize ?? 14}px`,
            ...style
        }
    }
}

export function createImage(dataKey: string, alternativeText: string, style?: CSS.Properties): ImageTemplateFragment {
    return {
        type: TemplateFragmentTypes.Image,
        dataKey,
        alternativeText,
        style: {
            ...style
        }
    }
}

export function createButton(buttonStyle: ButtonStyle, titleKey: string, action: string, style?: CSS.Properties): ButtonTemplateFragment {
    return {
        type: TemplateFragmentTypes.Button,
        buttonStyle,
        children: [
            createText(titleKey, 12)
        ],
        action: action,
        style: {
            ...style
        }
    }
}

export function createTable(tableData: string[][], colSpans: number[], tableIndex: number, data: { [id: string]: string }): TemplateFragment {
    const cells = [];
    let finalColSpans = colSpans.slice();
    for (let col = 0; col < tableData[0].length; col++) {
        const headerKey = `table${tableIndex}_header${col}`;
        data[headerKey] = tableData[0][col];
        cells.push(createText(headerKey, 10, { marginBottom: "10px", padding: "3px", whiteSpace: "nowrap", fontWeight: "bold", backgroundColor: "var(--openfin-ui-brandPrimary)" }));

        if (colSpans.length === 0) {
            finalColSpans.push(1);
        }
    }

    for (let row = 1; row < tableData.length; row++) {
        for (let col = 0; col < tableData[0].length; col++) {
            const rowColKey = `table${tableIndex}_col${col}_row${row}`;
            data[rowColKey] = tableData[row][col];
            cells.push(createText(rowColKey, 10, { padding: "3px", whiteSpace: "nowrap" }));
        }
    }

    return createContainer("row", cells, { display: "grid", gridTemplateColumns: finalColSpans.map(s => `${s}fr`).join(" "), marginBottom: "10px", overflow: "auto" });
}

export function createLabelledValue(labelKey: string, valueKey: string, style?: Record<string, string | number>): PlainContainerTemplateFragment {
    return {
        type: TemplateFragmentTypes.Container,
        style: {
            display: "flex",
            flexDirection: "column",
            marginBottom: "10px",
            ...style
        },
        children: [
            createText(labelKey, 12, { color: "gray" }),
            createText(valueKey, undefined, { color: "white" })
        ]
    }
}
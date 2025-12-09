package com.aiquiz.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PdfViewer")
public class PdfViewerPlugin extends Plugin {

    @PluginMethod
    public void openPdf(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null) {
            call.reject("Must provide a filePath");
            return;
        }

        // Remove file:// prefix if present
        if (filePath.startsWith("file://")) {
            filePath = filePath.substring(7);
        }

        Intent intent = new Intent(getContext(), PdfViewerActivity.class);
        intent.putExtra("filePath", filePath);
        getContext().startActivity(intent);
        call.resolve();
    }
}

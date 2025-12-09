package com.aiquiz.app;

import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageButton;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.github.barteksc.pdfviewer.PDFView;
import com.github.barteksc.pdfviewer.listener.OnErrorListener;
import java.io.File;

public class PdfViewerActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_pdf_viewer);

        PDFView pdfView = findViewById(R.id.pdfView);
        ImageButton btnClose = findViewById(R.id.btnClose);

        btnClose.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

        String filePath = getIntent().getStringExtra("filePath");
        if (filePath != null) {
            File file = new File(filePath);
            if (file.exists()) {
                pdfView.fromFile(file)
                        .enableSwipe(true)
                        .swipeHorizontal(false)
                        .enableDoubletap(true)
                        .defaultPage(0)
                        .enableAnnotationRendering(false)
                        .password(null)
                        .scrollHandle(null)
                        .enableAntialiasing(true)
                        .spacing(0)
                        .onError(new OnErrorListener() {
                            @Override
                            public void onError(Throwable t) {
                                Toast.makeText(PdfViewerActivity.this, "Error loading PDF: " + t.getMessage(), Toast.LENGTH_LONG).show();
                            }
                        })
                        .load();
            } else {
                Toast.makeText(this, "File not found: " + filePath, Toast.LENGTH_LONG).show();
            }
        } else {
            Toast.makeText(this, "No file path provided", Toast.LENGTH_SHORT).show();
        }
    }
}

package com.aiquiz.app;

import android.graphics.Rect;
import android.os.Bundle;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.WindowManager;
import android.widget.FrameLayout;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PdfViewerPlugin.class);
        super.onCreate(savedInstanceState);
        // 保持 adjustResize 以配合手动计算
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        
        // 启用手动布局调整，解决原生 adjustResize 可能导致的布局高度异常（如底部留白过大）
        AndroidBug5497Workaround.assistActivity(this);
    }
}

class AndroidBug5497Workaround {

    public static void assistActivity(MainActivity activity) {
        new AndroidBug5497Workaround(activity);
    }

    private View mChildOfContent;
    private int usableHeightPrevious;
    private FrameLayout.LayoutParams frameLayoutParams;
    private MainActivity activity;

    private AndroidBug5497Workaround(MainActivity activity) {
        this.activity = activity;
        FrameLayout content = (FrameLayout) activity.findViewById(android.R.id.content);
        mChildOfContent = content.getChildAt(0);
        mChildOfContent.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
            public void onGlobalLayout() {
                possiblyResizeChildOfContent();
            }
        });
        frameLayoutParams = (FrameLayout.LayoutParams) mChildOfContent.getLayoutParams();
    }

    private void possiblyResizeChildOfContent() {
        int usableHeightNow = computeUsableHeight();
        if (usableHeightNow != usableHeightPrevious) {
            int usableHeightSansKeyboard = mChildOfContent.getRootView().getHeight();
            int heightDifference = usableHeightSansKeyboard - usableHeightNow;
            
            // 只有当高度变化超过屏幕的 1/4 时才认为是键盘弹出，避免因状态栏/导航栏微小变化导致的抖动
            if (heightDifference > (usableHeightSansKeyboard / 4)) {
                // 键盘弹出：手动设置高度为可视区域高度
                // 修复：减去状态栏高度，防止内容被推到键盘下方或出现白边
                frameLayoutParams.height = usableHeightSansKeyboard - heightDifference + getStatusBarHeight();
            } else {
                // 键盘收起：恢复全屏高度
                frameLayoutParams.height = usableHeightSansKeyboard;
            }
            
            mChildOfContent.requestLayout();
            usableHeightPrevious = usableHeightNow;
        }
    }

    private int computeUsableHeight() {
        Rect r = new Rect();
        mChildOfContent.getWindowVisibleDisplayFrame(r);
        return (r.bottom - r.top);
    }

    private int getStatusBarHeight() {
        int result = 0;
        int resourceId = activity.getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            result = activity.getResources().getDimensionPixelSize(resourceId);
        }
        return result;
    }
}
